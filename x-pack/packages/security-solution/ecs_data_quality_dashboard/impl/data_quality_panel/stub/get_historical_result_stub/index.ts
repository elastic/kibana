/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HistoricalResult } from '../../types';

export const getHistoricalResultStub = (indexName: string): HistoricalResult => ({
  batchId: 'b483fd8b-f46e-4db4-a419-f12214d9967f',
  indexName,
  indexPattern: '.kibana-event-log-*',
  isCheckAll: false,
  checkedAt: 1727215052075,
  docsCount: 618675,
  totalFieldCount: 112,
  ecsFieldCount: 44,
  customFieldCount: 64,
  incompatibleFieldCount: 1,
  incompatibleFieldMappingItems: [],
  incompatibleFieldValueItems: [
    {
      fieldName: 'event.category',
      expectedValues: [
        'api',
        'authentication',
        'configuration',
        'database',
        'driver',
        'email',
        'file',
        'host',
        'iam',
        'intrusion_detection',
        'library',
        'malware',
        'network',
        'package',
        'process',
        'registry',
        'session',
        'threat',
        'vulnerability',
        'web',
      ],
      actualValues: [
        {
          name: 'siem',
          count: 110616,
        },
      ],
      description:
        'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
    },
  ],
  sameFamilyFieldCount: 3,
  sameFamilyFields: ['error.message', 'error.stack_trace', 'message'],
  sameFamilyFieldItems: [
    {
      fieldName: 'error.message',
      expectedValue: 'match_only_text',
      actualValue: 'text',
      description: 'Error message.',
    },
    {
      fieldName: 'error.stack_trace',
      expectedValue: 'wildcard',
      actualValue: 'keyword',
      description: 'The stack trace of this error in plain text.',
    },
    {
      fieldName: 'message',
      expectedValue: 'match_only_text',
      actualValue: 'text',
      description:
        'For log events the message field contains the log message, optimized for viewing in a log viewer.\nFor structured logs without an original message field, other fields can be concatenated to form a human-readable summary of the event.\nIf multiple messages exist, they can be combined into one message.',
    },
  ],
  unallowedMappingFields: [],
  unallowedValueFields: ['event.category'],
  sizeInBytes: 85161596,
  ilmPhase: 'unmanaged',
  markdownComments: [
    `### ${indexName}\n`,
    `| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | ${indexName} | 618,675 (29.4%) | 1 | \`unmanaged\` | 81.2MB |\n\n`,
    '### **Incompatible fields** `1` **Same family** `3` **Custom fields** `64` **ECS compliant fields** `44` **All fields** `112`\n',
    "#### 1 incompatible field\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.11.0.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
    `\n\n#### Incompatible field values - ${indexName}\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | \`api\`, \`authentication\`, \`configuration\`, \`database\`, \`driver\`, \`email\`, \`file\`, \`host\`, \`iam\`, \`intrusion_detection\`, \`library\`, \`malware\`, \`network\`, \`package\`, \`process\`, \`registry\`, \`session\`, \`threat\`, \`vulnerability\`, \`web\` | \`siem\` (110616) |\n\n`,
  ],
  ecsVersion: '8.11.0',
  indexId: 'TUdSmpXrSNGeRlZqjw7L2A',
  error: null,
  '@timestamp': 1727215052173,
  checkedBy: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
});
