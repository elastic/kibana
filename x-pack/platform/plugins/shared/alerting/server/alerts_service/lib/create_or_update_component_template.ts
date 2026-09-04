/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ClusterPutComponentTemplateRequest,
  IndicesGetIndexTemplateIndexTemplateItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';
import { updateIndexTemplateFieldsLimit } from './update_index_template_fields_limit';
import { computeResourceHash, RESOURCE_CONTENT_HASH_META_FIELD } from './resource_hash';

interface CreateOrUpdateComponentTemplateOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  template: ClusterPutComponentTemplateRequest;
  totalFieldsLimit: number;
}

/**
 * Reads the content hash stamped in `_meta` on the currently-installed component
 * template, or `undefined` if the template does not exist, carries no stamp, or
 * cannot be read.
 */
const getInstalledComponentTemplateHash = async (
  esClient: ElasticsearchClient,
  name: string,
  logger: Logger
): Promise<string | undefined> => {
  try {
    const response = await retryTransientEsErrors(
      () => esClient.cluster.getComponentTemplate({ name }),
      { logger }
    );
    const existing = (response?.component_templates ?? []).find((ct) => ct.name === name);
    const meta = existing?.component_template?._meta;
    return meta?.[RESOURCE_CONTENT_HASH_META_FIELD];
  } catch (err) {
    // Any failure reading the installed hash (404, permissions, exhausted
    // retries) leaves the installed content unknown, which falls through to the
    // PUT. The check must never block an install that would otherwise succeed.
    logger.debug(
      `Could not read installed component template ${name} content hash; will install (${err.message})`
    );
    return undefined;
  }
};

const getIndexTemplatesUsingComponentTemplate = async (
  esClient: ElasticsearchClient,
  componentTemplateName: string,
  totalFieldsLimit: number,
  logger: Logger
) => {
  // Get all index templates and filter down to just the ones referencing this component template
  const { index_templates: indexTemplates } = await retryTransientEsErrors(
    () => esClient.indices.getIndexTemplate(),
    { logger }
  );
  const indexTemplatesUsingComponentTemplate = (indexTemplates ?? []).filter(
    (indexTemplate: IndicesGetIndexTemplateIndexTemplateItem) => {
      if (
        indexTemplate &&
        indexTemplate.index_template &&
        indexTemplate.index_template.composed_of
      ) {
        return indexTemplate.index_template.composed_of.includes(componentTemplateName);
      }
      return false;
    }
  );
  await asyncForEach(
    indexTemplatesUsingComponentTemplate,
    async (template: IndicesGetIndexTemplateIndexTemplateItem) => {
      await retryTransientEsErrors(
        () =>
          updateIndexTemplateFieldsLimit({
            esClient,
            template,
            limit: totalFieldsLimit,
          }),
        { logger }
      );
    }
  );
};

const createOrUpdateComponentTemplateHelper = async (
  esClient: ElasticsearchClient,
  template: ClusterPutComponentTemplateRequest,
  totalFieldsLimit: number,
  logger: Logger
) => {
  try {
    await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(template), { logger });
  } catch (error) {
    const reason = error?.meta?.body?.error?.caused_by?.caused_by?.caused_by?.reason;
    if (reason && reason.match(/Limit of total fields \[\d+\] has been exceeded/) != null) {
      if (reason === `Limit of total fields [${totalFieldsLimit}] has been exceeded`) {
        logger.info(
          `The total number of fields defined by the templates cannot exceed the limit [${totalFieldsLimit}]. if you want to add more fields, please increase the limit`
        );
      }
      // This error message occurs when there is an index template using this component template
      // that contains a field limit setting that using this component template exceeds
      // Specifically, this can happen for the ECS component template when we add new fields
      // to adhere to the ECS spec. Individual index templates specify field limits so if the
      // number of new ECS fields pushes the composed mapping above the limit, this error will
      // occur. We have to update the field limit inside the index template now otherwise we
      // can never update the component template
      await getIndexTemplatesUsingComponentTemplate(
        esClient,
        template.name,
        totalFieldsLimit,
        logger
      );

      // Try to update the component template again
      await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(template), {
        logger,
      });
    } else {
      throw error;
    }
  }
};

export const createOrUpdateComponentTemplate = async ({
  logger,
  esClient,
  template,
  totalFieldsLimit,
}: CreateOrUpdateComponentTemplateOpts) => {
  logger.debug(`Installing component template ${template.name}`);

  // Stamp the content hash so a later install can detect an unchanged template
  // and skip the cluster-state write. The hash covers the template body only
  // (settings + mappings); `_meta` is excluded so it never hashes itself.
  const contentHash = computeResourceHash(template.template);
  const stampedTemplate: ClusterPutComponentTemplateRequest = {
    ...template,
    _meta: {
      ...template._meta,
      [RESOURCE_CONTENT_HASH_META_FIELD]: contentHash,
    },
  };

  try {
    // Skip only on a positive hash match; any missing stamp / error falls through to the PUT.
    const installedHash = await getInstalledComponentTemplateHash(esClient, template.name, logger);
    if (installedHash === contentHash) {
      logger.debug(
        `Skipping install of component template ${template.name}; content unchanged (${contentHash})`
      );
      return;
    }

    await createOrUpdateComponentTemplateHelper(
      esClient,
      stampedTemplate,
      totalFieldsLimit,
      logger
    );
  } catch (err) {
    logger.error(`Error installing component template ${template.name} - ${err.message}`);
    throw err;
  }
};
