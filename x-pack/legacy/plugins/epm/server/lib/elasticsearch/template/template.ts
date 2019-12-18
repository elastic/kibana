/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Field } from '../../fields/field';
import { Dataset } from '../../../../common/types';
import { getDatasetAssetBaseName } from '../index';

export interface Template {
  order: number;
  index_patterns: string[];
  settings: any;
  mappings: object;
  aliases: object;
}

interface Properties {
  [key: string]: any;
}

export interface Mappings {
  properties: any;
}

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate(
  indexPattern: string,
  mappings: Mappings,
  pipelineName?: string | undefined
): Template {
  const template = getBaseTemplate(mappings);
  template.index_patterns = [indexPattern];
  if (pipelineName) {
    template.settings.index.default_pipeline = pipelineName;
  }
  return template;
}

/**
 * Generate mapping takes the given fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * @param fields
 */
export function generateMappings(fields: Field[]): Mappings {
  const props: Properties = {};
  fields.forEach(field => {
    // Are there more fields inside this field? Build them recursively
    if (field.fields && field.fields.length > 0) {
      props[field.name] = generateMappings(field.fields);
      return;
    }

    // If not type is defined, take keyword
    const type = field.type || 'keyword';
    // Only add keyword fields for now
    // TODO: add support for other field types
    if (type === 'keyword') {
      props[field.name] = { type };
    }
  });
  return { properties: props };
}

/**
 * Generates the template name out of the given information
 */
export function generateTemplateName(dataset: Dataset): string {
  return getDatasetAssetBaseName(dataset);
}

function getBaseTemplate(mappings: Mappings): Template {
  return {
    // We need to decide which order we use for the templates
    order: 1,
    // To be completed with the correct index patterns
    index_patterns: [],
    settings: {
      index: {
        // ILM Policy must be added here
        lifecycle: {
          name: 'logs-default',
          rollover_alias: 'logs-nginx-access-abcd',
        },
        // What should be our default for the compression?
        codec: 'best_compression',
        // W
        mapping: {
          total_fields: {
            limit: '10000',
          },
        },
        // This is the default from Beats? So far seems to be a good value
        refresh_interval: '5s',
        // Default in the stack now, still good to have it in
        number_of_shards: '1',
        // All the default fields which should be queried have to be added here.
        // So far we add all keyword and text fields here.
        query: {
          default_field: ['message'],
        },
        // We are setting 30 because it can be devided by several numbers. Useful when shrinking.
        number_of_routing_shards: '30',
      },
    },
    mappings: {
      // To be filled with interesting information about this specific index
      _meta: {
        package: 'foo',
      },
      // All the dynamic field mappings
      dynamic_templates: [
        // This makes sure all mappings are keywords by default
        {
          strings_as_keyword: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
            match_mapping_type: 'string',
          },
        },
      ],
      // As we define fields ahead, we don't need any automatic field detection
      // This makes sure all the fields are mapped to keyword by default to prevent mapping conflicts
      date_detection: false,
      // All the properties we know from the fields.yml file
      properties: mappings.properties,
    },
    // To be filled with the aliases that we need
    aliases: {},
  };
}
