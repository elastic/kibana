/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesPutIndexTemplateRequest,
  MappingTypeMapping,
  Metadata,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import type { IIndexPatternString } from '../resource_installer_utils';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';
import type { DataStreamAdapter } from './data_stream_adapter';
import {
  getTotalFieldsLimitFromSettings,
  getTotalFieldsLimitSettings,
  TOTAL_FIELDS_LIMIT_SETTING,
} from './total_fields_limit_settings';

interface GetIndexTemplateOpts {
  componentTemplateRefs: string[];
  ilmPolicyName: string;
  indexPatterns: IIndexPatternString;
  kibanaVersion: string;
  namespace: string;
  totalFieldsLimit: number;
  dataStreamAdapter: DataStreamAdapter;
}

export const getIndexTemplate = ({
  componentTemplateRefs,
  ilmPolicyName,
  indexPatterns,
  kibanaVersion,
  namespace,
  totalFieldsLimit,
  dataStreamAdapter,
}: GetIndexTemplateOpts): IndicesPutIndexTemplateRequest => {
  const indexMetadata: Metadata = {
    kibana: {
      version: kibanaVersion,
    },
    managed: true,
    namespace,
  };

  const patterns: string[] = [indexPatterns.pattern];
  if (indexPatterns.reindexedPattern) {
    patterns.push(indexPatterns.reindexedPattern);
  }

  const dataStreamFields = dataStreamAdapter.getIndexTemplateFields(indexPatterns.alias, patterns);

  const indexLifecycle = {
    name: ilmPolicyName,
    rollover_alias: dataStreamFields.rollover_alias,
  };

  return {
    name: indexPatterns.template,
    ...(dataStreamFields.data_stream ? { data_stream: dataStreamFields.data_stream } : {}),
    index_patterns: dataStreamFields.index_patterns,
    composed_of: componentTemplateRefs,
    template: {
      settings: {
        auto_expand_replicas: '0-1',
        hidden: true,
        ...(dataStreamAdapter.isUsingDataStreams()
          ? {}
          : {
              'index.lifecycle': indexLifecycle,
            }),
        'index.mapping.ignore_malformed': true,
        ...getTotalFieldsLimitSettings(totalFieldsLimit),
      },
      mappings: {
        dynamic: false,
        _meta: indexMetadata,
      },
      ...(indexPatterns.secondaryAlias
        ? {
            aliases: {
              [indexPatterns.secondaryAlias]: {
                is_write_index: false,
              },
            },
          }
        : {}),
    },
    _meta: indexMetadata,

    // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
    // then newly created indices will use the matching template with the *longest* namespace
    priority: namespace.length,
  };
};

interface CreateOrUpdateIndexTemplateOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
}

/**
 * Installs index template that uses installed component template
 * Prior to installation, simulates the installation to check for possible
 * conflicts. Simulate should return an empty mapping if a template
 * conflicts with an already installed template.
 */
const getExistingTemplateFieldsLimit = async (
  esClient: ElasticsearchClient,
  name: string,
  logger: Logger
): Promise<number | undefined> => {
  try {
    const response = await retryTransientEsErrors(
      () => esClient.indices.getIndexTemplate({ name }),
      { logger }
    );
    const existingTemplate = (response?.index_templates ?? []).find(
      (indexTemplate) => indexTemplate.name === name
    );
    return getTotalFieldsLimitFromSettings(existingTemplate?.index_template?.template?.settings);
  } catch (err) {
    if (err?.statusCode === 404) {
      return undefined;
    }
    throw err;
  }
};

export const createOrUpdateIndexTemplate = async ({
  logger,
  esClient,
  template,
}: CreateOrUpdateIndexTemplateOpts) => {
  logger.debug(`Installing index template ${template.name}`);

  let templateToInstall = template;
  try {
    // Never lower a total_fields.limit that is already higher than the configured value;
    // a higher limit may have been set manually or by a previous, higher configuration.
    const existingLimit = await getExistingTemplateFieldsLimit(esClient, template.name, logger);
    const templateLimit = getTotalFieldsLimitFromSettings(template.template?.settings);
    if (
      existingLimit !== undefined &&
      templateLimit !== undefined &&
      existingLimit > templateLimit
    ) {
      logger.debug(
        `Preserving existing total_fields.limit of ${existingLimit} for index template ${template.name} instead of lowering it to ${templateLimit}`
      );
      templateToInstall = {
        ...template,
        template: {
          ...template.template,
          settings: {
            ...template.template?.settings,
            [TOTAL_FIELDS_LIMIT_SETTING]: existingLimit,
          },
        },
      };
    }
  } catch (err) {
    logger.error(`Error fetching existing index template ${template.name} - ${err.message}`, err);
    throw err;
  }

  let mappings: MappingTypeMapping = {};
  try {
    // Simulate the index template to proactively identify any issues with the mapping
    const simulateResponse = await retryTransientEsErrors(
      () => esClient.indices.simulateTemplate(templateToInstall),
      { logger }
    );
    mappings = simulateResponse.template.mappings;
  } catch (err) {
    logger.error(
      `Failed to simulate index template mappings for ${template.name}; not applying mappings - ${err.message}`,
      err
    );
    return;
  }

  if (isEmpty(mappings)) {
    throw new Error(
      `No mappings would be generated for ${template.name}, possibly due to failed/misconfigured bootstrapping`
    );
  }

  try {
    await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(templateToInstall), {
      logger,
    });
  } catch (err) {
    logger.error(`Error installing index template ${template.name} - ${err.message}`, err);
    throw err;
  }
};
