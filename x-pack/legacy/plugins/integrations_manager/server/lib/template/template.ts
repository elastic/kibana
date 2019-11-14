/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate(indexPattern: string): object {
  const template = getBaseTemplate();
  template.index_patterns = [indexPattern];
  return template;
}

export interface Template {
  order: number;
  index_patterns: string[];
  settings: object;
  mappings: object;
  aliases: object;
}

function getBaseTemplate(): Template {
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
        // Example of a dynamic template
        {
          labels: {
            path_match: 'labels.*',
            mapping: {
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
      properties: {
        container: {
          properties: {
            image: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
          },
        },
      },
    },
    // To be filled with the aliases that we need
    aliases: {},
  };
}
