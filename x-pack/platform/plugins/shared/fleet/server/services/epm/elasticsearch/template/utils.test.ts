/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fillConstantKeywordValues } from './utils';

describe('fillConstantKeywordValues', () => {
  const oldMappings = {
    dynamic: false,
    _meta: {
      managed_by: 'fleet',
      managed: true,
      package: {
        name: 'elastic_agent',
      },
    },
    dynamic_templates: [
      {
        ecs_timestamp: {
          match: '@timestamp',
          mapping: {
            ignore_malformed: false,
            type: 'date',
          },
        },
      },
    ],
    date_detection: false,
    properties: {
      '@timestamp': {
        type: 'date',
        ignore_malformed: false,
      },
      load: {
        properties: {
          '1': {
            type: 'double',
          },
          '5': {
            type: 'double',
          },
          '15': {
            type: 'double',
          },
        },
      },
      event: {
        properties: {
          agent_id_status: {
            type: 'keyword',
            ignore_above: 1024,
          },
          dataset: {
            type: 'constant_keyword',
            value: 'elastic_agent.metricbeat',
          },
          ingested: {
            type: 'date',
            format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            ignore_malformed: false,
          },
        },
      },
      message: {
        type: 'match_only_text',
      },
      'dot.field': {
        type: 'keyword',
      },
      constant_keyword_without_value: {
        type: 'constant_keyword',
      },
    },
  };

  const newMappings = {
    dynamic: false,
    _meta: {
      managed_by: 'fleet',
      managed: true,
      package: {
        name: 'elastic_agent',
      },
    },
    dynamic_templates: [
      {
        ecs_timestamp: {
          match: '@timestamp',
          mapping: {
            ignore_malformed: false,
            type: 'date',
          },
        },
      },
    ],
    date_detection: false,
    properties: {
      '@timestamp': {
        type: 'date',
        ignore_malformed: false,
      },
      load: {
        properties: {
          '1': {
            type: 'double',
          },
          '5': {
            type: 'double',
          },
          '15': {
            type: 'double',
          },
        },
      },
      event: {
        properties: {
          agent_id_status: {
            type: 'keyword',
            ignore_above: 1024,
          },
          dataset: {
            type: 'constant_keyword',
          },
          ingested: {
            type: 'date',
            format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
            ignore_malformed: false,
          },
        },
      },
      message: {
        type: 'match_only_text',
      },
      'dot.field': {
        type: 'keyword',
      },
      some_new_field: {
        type: 'keyword',
      },
      constant_keyword_without_value: {
        type: 'constant_keyword',
      },
    },
  };

  it('should fill in missing constant_keyword values from old mappings correctly', () => {
    // @ts-ignore
    expect(fillConstantKeywordValues(oldMappings, newMappings)).toEqual({
      dynamic: false,
      _meta: {
        managed_by: 'fleet',
        managed: true,
        package: {
          name: 'elastic_agent',
        },
      },
      dynamic_templates: [
        {
          ecs_timestamp: {
            match: '@timestamp',
            mapping: {
              ignore_malformed: false,
              type: 'date',
            },
          },
        },
      ],
      date_detection: false,
      properties: {
        '@timestamp': {
          type: 'date',
          ignore_malformed: false,
        },
        load: {
          properties: {
            '1': {
              type: 'double',
            },
            '5': {
              type: 'double',
            },
            '15': {
              type: 'double',
            },
          },
        },
        event: {
          properties: {
            agent_id_status: {
              type: 'keyword',
              ignore_above: 1024,
            },
            dataset: {
              type: 'constant_keyword',
              value: 'elastic_agent.metricbeat',
            },
            ingested: {
              type: 'date',
              format: 'strict_date_time_no_millis||strict_date_optional_time||epoch_millis',
              ignore_malformed: false,
            },
          },
        },
        message: {
          type: 'match_only_text',
        },
        'dot.field': {
          type: 'keyword',
        },
        some_new_field: {
          type: 'keyword',
        },
        constant_keyword_without_value: {
          type: 'constant_keyword',
        },
      },
    });
  });

  it('should return the same mappings if old mappings are not provided', () => {
    // @ts-ignore
    expect(fillConstantKeywordValues({}, newMappings)).toMatchObject(newMappings);
  });
});
