/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../../../types/streamlang';
import type {
  RenameProcessor,
  SetProcessor,
  GrokProcessor,
  DateProcessor,
  DissectProcessor,
  ManualIngestPipelineProcessor,
  AppendProcessor,
  ConvertProcessor,
} from '../../../../types/processors';

export const comprehensiveTestDSL: StreamlangDSL = {
  steps: [
    // Convert a field to a different type
    {
      action: 'convert',
      from: 'http.status_code',
      type: 'string',
      to: 'http.status_code_str',
      where: {
        field: 'http.error',
        eq: 404,
      },
    } as ConvertProcessor,
    // Rename a field
    {
      action: 'rename',
      from: 'attributes.old_name',
      to: 'attributes.new_name',
    } as RenameProcessor,
    // Set a field to a constant value
    {
      action: 'set',
      to: 'attributes.status',
      value: 'active',
    } as SetProcessor,
    // Grok parsing
    {
      action: 'grok',
      from: 'body.message',
      patterns: ['%{IP:attributes.client_ip} - %{WORD:attributes.method}'],
    } as GrokProcessor,
    // Date parsing and formatting
    {
      action: 'date',
      from: 'attributes.timestamp',
      formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSZ", 'yyyy-MM-dd HH:mm:ss'],
      to: 'attributes.parsed_time',
      output_format: 'yyyy-MM-dd',
    } as DateProcessor,
    // Dissect parsing
    {
      action: 'dissect',
      from: 'body.log',
      pattern: '%{attributes.client} %{attributes.method} %{attributes.path}',
    } as DissectProcessor,
    // Append parsing
    {
      action: 'append',
      to: 'attributes.tags',
      value: ['new_tag'],
    } as AppendProcessor,
    // Conditional execution (inline where)
    {
      action: 'set',
      to: 'attributes.flag',
      value: 'yes',
      where: {
        field: 'attributes.status',
        eq: 'active',
      },
    } as SetProcessor,
    // Multiple steps under a condition (where block)
    {
      where: {
        field: 'attributes.env',
        eq: 'prod',
        steps: [
          {
            action: 'set',
            to: 'attributes.prod_flag',
            value: 'prod-env',
          } as SetProcessor,
        ],
      },
    },
    // Nested conditionals
    {
      where: {
        or: [
          { field: 'attributes.a', eq: 1 }, // condition A
          { field: 'attributes.b', eq: 2 }, // condition B
        ],
        steps: [
          {
            action: 'set',
            to: 'attributes.prod_flag',
            value: 'prod-env',
          } as SetProcessor,
          {
            where: {
              field: 'attributes.department',
              eq: 'legal',
              steps: [
                {
                  action: 'set',
                  to: 'attributes.department_flag',
                  value: 'legal-department',
                } as SetProcessor,
              ],
            },
          },
        ],
      },
    },
    // Complex (boolean) conditionals
    {
      action: 'set',
      to: 'attributes.test',
      value: 'yes',
      where: {
        or: [
          { field: 'attributes.status', eq: 'active' },
          {
            and: [
              { field: 'attributes.status', eq: 'inactive' },
              { field: 'attributes.read_only', eq: false },
            ],
          },
        ],
      },
    } as SetProcessor,
    // Escape hatch (manual ingest pipeline configuration)
    {
      action: 'manual_ingest_pipeline',
      processors: [
        {
          set: {
            field: 'attributes.my_field',
            value: 'my_value',
          },
        },
      ],
    } as ManualIngestPipelineProcessor,
  ],
};

export const notConditionsTestDSL: StreamlangDSL = {
  steps: [
    {
      action: 'set',
      to: 'attributes.not_flag',
      value: 'not-active',
      where: {
        not: {
          field: 'attributes.status',
          eq: 'active',
        },
      },
    } as SetProcessor,
    {
      where: {
        not: {
          or: [
            { field: 'attributes.a', eq: 1 },
            { field: 'attributes.b', eq: 2 },
          ],
        },
        steps: [
          {
            action: 'set',
            to: 'attributes.not_nested',
            value: 'not-a-or-b',
          } as SetProcessor,
        ],
      },
    },
  ],
};

export const typeCoercionsTestDSL: StreamlangDSL = {
  steps: [
    // Boolean true coercion test (both eq and neq)
    {
      action: 'set',
      to: 'attributes.boolean_true_test',
      value: 'matched_true_test',
      where: {
        and: [
          { field: 'attributes.is_active', eq: true },
          { field: 'attributes.is_active_str', eq: 'true' },
          { field: 'attributes.is_inactive', neq: true },
          { field: 'attributes.is_inactive_str', neq: 'true' },
        ],
      },
    } as SetProcessor,
    // Boolean false coercion test (both eq and neq)
    {
      action: 'set',
      to: 'attributes.boolean_false_test',
      value: 'matched_false_test',
      where: {
        and: [
          { field: 'attributes.is_disabled', eq: false },
          { field: 'attributes.is_disabled_str', eq: 'false' },
          { field: 'attributes.is_enabled', neq: false },
          { field: 'attributes.is_enabled_str', neq: 'false' },
        ],
      },
    } as SetProcessor,
    // Numeric 450 coercion test (both eq and neq)
    {
      action: 'set',
      to: 'attributes.numeric_450_test',
      value: 'matched_450_test',
      where: {
        and: [
          { field: 'attributes.status_code', eq: 450 },
          { field: 'attributes.status_code_str', eq: '450' },
          { field: 'attributes.other_code', neq: 450 },
          { field: 'attributes.other_code_str', neq: '450' },
        ],
      },
    } as SetProcessor,
    // Mixed type coercion with range and comparisons
    {
      action: 'set',
      to: 'attributes.mixed_coercion_test',
      value: 'matched_mixed_coercion',
      where: {
        and: [
          { field: 'attributes.response_time', gt: 100 },
          { field: 'attributes.response_time_str', gt: '100' },
          { field: 'attributes.port', range: { gte: '8000', lte: '9000' } },
          { field: 'attributes.is_enabled', eq: true },
          { field: 'attributes.count_str', eq: '42' },
        ],
      },
    } as SetProcessor,
  ],
};

export const manualIngestPipelineTestDSL: StreamlangDSL = {
  steps: [
    {
      action: 'manual_ingest_pipeline',
      processors: [
        {
          set: {
            field: 'foo',
            value: 'bar',
            if: 'ctx._source.active == true',
          },
        },
        {
          rename: {
            field: 'foo',
            target_field: 'baz',
          },
        },
        {
          set: {
            field: 'baz',
            value: 'qux',
            if: "ctx._source.env == 'prod'",
          },
        },
      ],
      where: {
        field: 'attributes.status',
        eq: 'active',
      },
      ignore_failure: true,
      tag: 'custom-pipeline',
      on_failure: [
        {
          set: {
            field: 'error',
            value: 'failed',
          },
        },
      ],
    } as ManualIngestPipelineProcessor,
  ],
};
