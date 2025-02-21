/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ClusterPutComponentTemplateRequest,
  IndicesIndexTemplate,
  MappingDateProperty,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import {
  WiredStreamDefinition,
  UnwiredStreamDefinition,
  getAdvancedParameters,
  isDslLifecycle,
  isIlmLifecycle,
  isRoot,
  IngestStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { logsSettings } from './logs_layer';
import { getBaseLayerComponentName, getStreamLayerComponentName } from './name';

export function generateWiredLayer(
  definition: WiredStreamDefinition,
  isServerless: boolean
): ClusterPutComponentTemplateRequest {
  const properties: Record<string, MappingProperty> = {};
  Object.entries(definition.ingest.wired.fields).forEach(([field, props]) => {
    const property: MappingProperty = {
      type: props.type,
    };

    const advancedParameters = getAdvancedParameters(field, props);

    if (Object.keys(advancedParameters).length > 0) {
      Object.assign(property, advancedParameters);
    }

    if (field === '@timestamp') {
      // @timestamp can't ignore malformed dates as it's used for sorting in logsdb
      (property as MappingDateProperty).ignore_malformed = false;
    }
    if (props.type === 'date' && props.format) {
      (property as MappingDateProperty).format = props.format;
    }

    properties[field] = property;
  });

  return {
    name: getStreamLayerComponentName(definition.name),
    template: {
      lifecycle: getTemplateLifecycle(definition, isServerless),
      settings: getTemplateSettings(definition, isServerless),
      mappings: {
        subobjects: false,
        dynamic: false,
        properties,
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${definition.name} stream`,
    },
  };
}

export function generateUnwiredBaseLayer(
  definition: UnwiredStreamDefinition,
  existingTemplate: IndicesIndexTemplate
): ClusterPutComponentTemplateRequest {
  return {
    name: getBaseLayerComponentName(definition.name),
    template: {
      lifecycle: existingTemplate.template?.lifecycle,
      settings: existingTemplate.template?.settings,
      mappings: existingTemplate.template?.mappings,
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Base settings for the ${definition.name} stream`,
    },
  };
}

export function generateUnwiredLayer(
  definition: UnwiredStreamDefinition,
  isServerless: boolean
): ClusterPutComponentTemplateRequest {
  return {
    name: getStreamLayerComponentName(definition.name),
    template: {
      lifecycle: getTemplateLifecycle(definition, isServerless),
      settings: getTemplateSettings(definition, isServerless),
      mappings: {
        subobjects: false,
        dynamic: false,
        properties: {},
      },
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${definition.name} stream`,
    },
  };
}

function getTemplateLifecycle(definition: IngestStreamDefinition, isServerless: boolean) {
  const lifecycle = definition.ingest.lifecycle;
  if (isServerless) {
    // dlm cannot be disabled in serverless
    return {
      data_retention: isDslLifecycle(lifecycle) ? lifecycle.dsl.data_retention : undefined,
    };
  }

  if (isIlmLifecycle(lifecycle)) {
    return { enabled: false };
  }

  if (isDslLifecycle(lifecycle)) {
    return {
      enabled: true,
      data_retention: lifecycle.dsl.data_retention,
    };
  }

  return undefined;
}

function getTemplateSettings(definition: IngestStreamDefinition, isServerless: boolean) {
  const baseSettings =
    isWiredStreamDefinition(definition) && isRoot(definition.name) ? logsSettings : {};
  const lifecycle = definition.ingest.lifecycle;

  if (isServerless) {
    return baseSettings;
  }

  if (isIlmLifecycle(lifecycle)) {
    return {
      ...baseSettings,
      'index.lifecycle.prefer_ilm': true,
      'index.lifecycle.name': lifecycle.ilm.policy,
    };
  }

  if (isDslLifecycle(lifecycle)) {
    return {
      ...baseSettings,
      'index.lifecycle.prefer_ilm': false,
      'index.lifecycle.name': undefined,
    };
  }

  // don't specify any lifecycle property when lifecyle is disabled or inherited
  return baseSettings;
}
