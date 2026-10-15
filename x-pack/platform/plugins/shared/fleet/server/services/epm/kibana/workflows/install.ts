/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import pMap from 'p-map';
import { isMap, parseDocument } from 'yaml';
import { isValidId } from '@kbn/human-readable-id';
import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import { FLEET_PACKAGE_WORKFLOW_ID } from '@kbn/workflows/managed';

import { FleetError } from '../../../../errors';
import type { ManagedWorkflowsClient } from '../../../app_context';
import type { KibanaAssetReference, PackageInstallContext } from '../../../../../common/types';
import { KibanaSavedObjectType } from '../../../../../common/types';
import { getPathParts } from '../../archive';

const MAX_CONCURRENT_WORKFLOW_OPERATIONS = 5;

const WORKFLOW_FILE_EXTENSION = '.yml';

const normalizeIdSegment = (value: string) => value.toLowerCase().replace(/_/g, '-');

const isYamlMapping = (yaml: string) => {
  const document = parseDocument(yaml);
  return document.errors.length === 0 && isMap(document.contents);
};

export const isWorkflowAssetPath = (path: string) => {
  const { service, type } = getPathParts(path);
  return service === 'kibana' && type === 'workflow' && path.endsWith(WORKFLOW_FILE_EXTENSION);
};

/** Returns undefined when the file name cannot produce a valid workflow id. */
export const getPackageWorkflowId = ({
  spaceId,
  pkgName,
  path,
}: {
  spaceId: string;
  pkgName: string;
  path: string;
}): string | undefined => {
  const fileName = path.split('/').pop() ?? '';
  const fileBase = fileName.slice(0, -WORKFLOW_FILE_EXTENSION.length);
  const pkgPrefix = `${pkgName}-`;
  const name = fileBase.startsWith(pkgPrefix) ? fileBase.slice(pkgPrefix.length) : fileBase;

  const workflowId = [
    FLEET_PACKAGE_WORKFLOW_ID,
    normalizeIdSegment(spaceId),
    normalizeIdSegment(pkgName),
    normalizeIdSegment(name),
  ].join('-');

  return isValidId(workflowId) ? workflowId : undefined;
};

/** Removes the given workflow refs, logging failures instead of throwing. */
export const uninstallWorkflows = async ({
  client,
  refs,
  spaceId,
  logger,
}: {
  client: ManagedWorkflowsClient;
  refs: KibanaAssetReference[];
  spaceId: string;
  logger: Logger;
}) => {
  await pMap(
    refs.filter(({ type }) => type === KibanaSavedObjectType.workflow),
    async ({ id }) => {
      try {
        await client.uninstall(FLEET_PACKAGE_WORKFLOW_ID, { spaceId, workflowId: id });
      } catch (error) {
        logger.warn(`Failed to uninstall workflow ${id}: ${error.message}`);
      }
    },
    { concurrency: MAX_CONCURRENT_WORKFLOW_OPERATIONS }
  );
};

export const installWorkflows = async ({
  client,
  packageInstallContext,
  spaceId,
  logger,
  previousRefs = [],
}: {
  client: ManagedWorkflowsClient;
  packageInstallContext: PackageInstallContext;
  spaceId: string;
  logger: Logger;
  previousRefs?: KibanaAssetReference[];
}): Promise<KibanaAssetReference[]> => {
  const { name: pkgName } = packageInstallContext.packageInfo;

  const workflows: Array<{ workflowId: string; yaml: string }> = [];
  await packageInstallContext.archiveIterator.traverseEntries(async ({ path, buffer }) => {
    if (!buffer) {
      return;
    }
    const yaml = buffer.toString('utf8');
    if (yaml.length > MAX_WORKFLOW_YAML_LENGTH) {
      throw new FleetError(
        `Workflow asset ${path} exceeds the maximum size of ${MAX_WORKFLOW_YAML_LENGTH} characters`
      );
    }

    const workflowId = getPackageWorkflowId({ spaceId, pkgName, path });
    if (!workflowId) {
      logger.warn(`Skipping workflow asset ${path}: it cannot be mapped to a valid workflow id`);
      return;
    }
    if (!isYamlMapping(yaml)) {
      logger.warn(`Skipping workflow asset ${path}: it is not a valid YAML mapping`);
      return;
    }
    workflows.push({ workflowId, yaml });
  }, isWorkflowAssetPath);

  const previousIds = new Set(previousRefs.map(({ id }) => id));
  const installedNewIds: string[] = [];
  const failures: Error[] = [];

  const results = await pMap(
    workflows,
    async ({ workflowId, yaml }): Promise<KibanaAssetReference | undefined> => {
      try {
        await client.install(FLEET_PACKAGE_WORKFLOW_ID, { spaceId, workflowId, values: { yaml } });
        if (!previousIds.has(workflowId)) {
          installedNewIds.push(workflowId);
        }

        // install() resolves even when nothing was written (license, availability, ES readiness).
        const { status } = await client.getWorkflowStatus(FLEET_PACKAGE_WORKFLOW_ID, {
          spaceId,
          workflowId,
        });
        const deferred = status === 'missing' || status === 'not_managed';
        if (deferred) {
          logger.warn(`Workflow ${workflowId} was not installed, deferring it`);
        } else if (status === 'invalid') {
          logger.warn(
            `Workflow ${workflowId} was installed but does not pass workflow validation, it will stay disabled until fixed`
          );
        }
        return { id: workflowId, type: KibanaSavedObjectType.workflow, deferred };
      } catch (error) {
        failures.push(error);
        return undefined;
      }
    },
    { concurrency: MAX_CONCURRENT_WORKFLOW_OPERATIONS }
  );

  if (failures.length) {
    // The refs are only saved once every workflow is installed, so workflows created by this
    // run would be orphaned: no later uninstall or rollback would know about them.
    await uninstallWorkflows({
      client,
      refs: installedNewIds.map((id) => ({ id, type: KibanaSavedObjectType.workflow })),
      spaceId,
      logger,
    });
    throw failures[0];
  }
  const refs = results.filter((ref): ref is KibanaAssetReference => ref !== undefined);

  const currentIds = new Set(refs.map(({ id }) => id));
  const removedRefs = previousRefs.filter(({ id }) => !currentIds.has(id));
  await uninstallWorkflows({ client, refs: removedRefs, spaceId, logger });

  return refs;
};
