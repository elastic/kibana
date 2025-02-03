/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  IndicesGetIndexTemplateIndexTemplateItem,
  type IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger, ElasticsearchClient } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { retryTransientEsErrors } from './retry_transient_es_errors';

interface CreateOrUpdateComponentTemplateOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  template: ClusterPutComponentTemplateRequest;
  totalFieldsLimit: number;
}

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
          esClient.indices.putIndexTemplate({
            name: template.name,
            body: {
              ...template.index_template,
              template: {
                ...template.index_template.template,
                settings: {
                  ...template.index_template.template?.settings,
                  'index.mapping.total_fields.limit': totalFieldsLimit,
                },
              },
            } as IndicesPutIndexTemplateRequest['body'],
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

  try {
    await createOrUpdateComponentTemplateHelper(esClient, template, totalFieldsLimit, logger);
  } catch (err) {
    logger.error(`Error installing component template ${template.name} - ${err.message}`);
    throw err;
  }
};
