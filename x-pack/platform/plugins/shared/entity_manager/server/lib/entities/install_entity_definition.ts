/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EntityDefinition, EntityDefinitionUpdate } from '@kbn/entities-schema';
import { Logger } from '@kbn/logging';
import { generateLatestIndexTemplateId } from './helpers/generate_component_id';
import { createAndInstallIngestPipelines } from './create_and_install_ingest_pipeline';
import { createAndInstallTransforms } from './create_and_install_transform';
import { validateDefinitionCanCreateValidTransformIds } from './transform/validate_transform_ids';
import { deleteEntityDefinition } from './delete_entity_definition';
import { deleteLatestIngestPipeline } from './delete_ingest_pipeline';
import { findEntityDefinitionById } from './find_entity_definition';
import {
  entityDefinitionExists,
  saveEntityDefinition,
  updateEntityDefinition,
} from './save_entity_definition';
import { createAndInstallTemplates, deleteTemplate } from '../manage_index_templates';
import { EntityIdConflict } from './errors/entity_id_conflict_error';
import { EntityDefinitionNotFound } from './errors/entity_not_found';
import { mergeEntityDefinitionUpdate } from './helpers/merge_definition_update';
import { EntityDefinitionWithState } from './types';
import { stopLatestTransform, stopTransforms } from './stop_transforms';
import { deleteLatestTransform, deleteTransforms } from './delete_transforms';
import { deleteIndices } from './delete_index';

export interface InstallDefinitionParams {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  definition: EntityDefinition;
  logger: Logger;
}

// install an entity definition from scratch with all its required components
// after verifying that the definition id is valid and available.
// attempt to remove all installed components if the installation fails.
export async function installEntityDefinition({
  esClient,
  soClient,
  definition,
  logger,
}: InstallDefinitionParams): Promise<EntityDefinition> {
  validateDefinitionCanCreateValidTransformIds(definition);

  if (await entityDefinitionExists(soClient, definition.id)) {
    throw new EntityIdConflict(`Entity definition [${definition.id}] already exists.`, definition);
  }

  try {
    const entityDefinition = await saveEntityDefinition(soClient, {
      ...definition,
      installStatus: 'installing',
      installStartedAt: new Date().toISOString(),
      installedComponents: [],
    });

    return await install({ esClient, soClient, logger, definition: entityDefinition });
  } catch (e) {
    logger.error(`Failed to install entity definition [${definition.id}]: ${e}`);

    await stopLatestTransform(esClient, definition, logger);
    await deleteLatestTransform(esClient, definition, logger);

    await deleteLatestIngestPipeline(esClient, definition, logger);

    await deleteTemplate({
      esClient,
      logger,
      name: generateLatestIndexTemplateId(definition),
    });

    await deleteEntityDefinition(soClient, definition).catch((err) => {
      if (err instanceof EntityDefinitionNotFound) {
        return;
      }
      throw err;
    });

    throw e;
  }
}

export async function installBuiltInEntityDefinitions({
  esClient,
  soClient,
  logger,
  definitions,
}: Omit<InstallDefinitionParams, 'definition' | 'esClient'> & {
  esClient: ElasticsearchClient;
  definitions: EntityDefinition[];
}): Promise<EntityDefinition[]> {
  if (definitions.length === 0) return [];

  logger.info(`Checking installation of ${definitions.length} built-in definitions`);
  const installPromises = definitions.map(async (builtInDefinition) => {
    const installedDefinition = await findEntityDefinitionById({
      soClient,
      esClient,
      id: builtInDefinition.id,
      includeState: true,
    });

    if (!installedDefinition) {
      // clean data from previous installation
      await deleteIndices(esClient, builtInDefinition, logger);

      return await installEntityDefinition({
        definition: builtInDefinition,
        esClient,
        soClient,
        logger,
      });
    }

    // verify existing installation
    if (
      !shouldReinstallBuiltinDefinition(
        installedDefinition as EntityDefinitionWithState,
        builtInDefinition
      )
    ) {
      return installedDefinition;
    }

    logger.info(
      `Detected failed or outdated installation of definition [${installedDefinition.id}] v${installedDefinition.version}, installing v${builtInDefinition.version}`
    );
    return await reinstallEntityDefinition({
      soClient,
      esClient,
      logger,
      definition: installedDefinition,
      definitionUpdate: builtInDefinition,
      deleteData: true,
    });
  });

  return await Promise.all(installPromises);
}

// perform installation of an entity definition components.
// assume definition saved object is already persisted
async function install({
  esClient,
  soClient,
  definition,
  logger,
}: InstallDefinitionParams): Promise<EntityDefinition> {
  logger.info(`Installing definition [${definition.id}] v${definition.version}`);
  logger.debug(() => JSON.stringify(definition, null, 2));

  logger.debug(`Installing index templates for definition [${definition.id}]`);
  const templates = await createAndInstallTemplates(esClient, definition, logger);

  logger.debug(`Installing ingest pipelines for definition [${definition.id}]`);
  const pipelines = await createAndInstallIngestPipelines(esClient, definition, logger);

  logger.debug(`Installing transforms for definition [${definition.id}]`);
  const transforms = await createAndInstallTransforms(esClient, definition, logger);

  const updatedProps = await updateEntityDefinition(soClient, definition.id, {
    installStatus: 'installed',
    installedComponents: [...templates, ...pipelines, ...transforms],
  });
  return { ...definition, ...updatedProps.attributes };
}

// stop and delete the current transforms and reinstall all the components
export async function reinstallEntityDefinition({
  esClient,
  soClient,
  definition,
  definitionUpdate,
  logger,
  deleteData = false,
}: Omit<InstallDefinitionParams, 'esClient'> & {
  esClient: ElasticsearchClient;
  definitionUpdate: EntityDefinitionUpdate;
  deleteData?: boolean;
}): Promise<EntityDefinition> {
  try {
    const updatedDefinition = mergeEntityDefinitionUpdate(definition, definitionUpdate);

    logger.debug(
      () =>
        `Reinstalling definition [${definition.id}] from v${definition.version} to v${
          definitionUpdate.version
        }\n${JSON.stringify(updatedDefinition, null, 2)}`
    );

    await updateEntityDefinition(soClient, definition.id, {
      ...updatedDefinition,
      installStatus: 'upgrading',
      installStartedAt: new Date().toISOString(),
    });

    logger.debug(`Deleting transforms for definition [${definition.id}] v${definition.version}`);
    await stopAndDeleteTransforms(esClient, definition, logger);

    if (deleteData) {
      await deleteIndices(esClient, definition, logger);
    }

    return await install({
      soClient,
      logger,
      esClient,
      definition: updatedDefinition,
    });
  } catch (err) {
    await updateEntityDefinition(soClient, definition.id, {
      installStatus: 'failed',
    });

    throw err;
  }
}

const INSTALLATION_TIMEOUT = 5 * 60 * 1000;
export const installationInProgress = (definition: EntityDefinition) => {
  const { installStatus, installStartedAt } = definition;

  return (
    (installStatus === 'installing' || installStatus === 'upgrading') &&
    Date.now() - Date.parse(installStartedAt!) < INSTALLATION_TIMEOUT
  );
};

const installationTimedOut = (definition: EntityDefinition) => {
  const { installStatus, installStartedAt } = definition;

  return (
    (installStatus === 'installing' || installStatus === 'upgrading') &&
    Date.now() - Date.parse(installStartedAt!) >= INSTALLATION_TIMEOUT
  );
};

const shouldReinstallBuiltinDefinition = (
  installedDefinition: EntityDefinitionWithState,
  latestDefinition: EntityDefinition
) => {
  const { installStatus, version, state } = installedDefinition;

  const timedOut = installationTimedOut(installedDefinition);
  const outdated = installStatus === 'installed' && semver.neq(version, latestDefinition.version);
  const failed = installStatus === 'failed';
  const partial = installStatus === 'installed' && !state.installed;

  return timedOut || outdated || failed || partial;
};

const stopAndDeleteTransforms = async (
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) => {
  await stopTransforms(esClient, definition, logger);
  await deleteTransforms(esClient, definition, logger);
};
