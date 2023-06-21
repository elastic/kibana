/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataQualityCheckResult } from '../../types';

export const mockDataQualityCheckResult: Record<string, DataQualityCheckResult> = {
  'auditbeat-custom-index-1': {
    docsCount: 4,
    error: null,
    ilmPhase: 'unmanaged',
    incompatible: 3,
    indexName: 'auditbeat-custom-index-1',
    markdownComments: [
      '### auditbeat-custom-index-1\n',
      '| Result | Index | Docs | Incompatible fields | ILM Phase |\n|--------|-------|------|---------------------|-----------|\n| ❌ | auditbeat-custom-index-1 | 4 (0.0%) | 3 | `unmanaged` |\n\n',
      '### **Incompatible fields** `3` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
      "#### 3 incompatible fields, 0 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\nIncompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.\n\nWhen an incompatible field is not in the same family:\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
      '\n#### Incompatible field mappings - auditbeat-custom-index-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text`  |\n| source.ip | `ip` | `text`  |\n\n#### Incompatible field values - auditbeat-custom-index-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2),\n`theory` (1) |\n\n',
    ],
    pattern: 'auditbeat-*',
  },
  'auditbeat-7.9.3-2023.02.13-000001': {
    docsCount: 2438,
    error: null,
    ilmPhase: 'hot',
    incompatible: 12,
    indexName: 'auditbeat-7.9.3-2023.02.13-000001',
    markdownComments: [
      '### auditbeat-7.9.3-2023.02.13-000001\n',
      '| Result | Index | Docs | Incompatible fields | ILM Phase |\n|--------|-------|------|---------------------|-----------|\n| ❌ | auditbeat-7.9.3-2023.02.13-000001 | 2,438 (4.2%) | 12 | `hot` |\n\n',
      '### **Incompatible fields** `12` **Custom fields** `439` **ECS compliant fields** `506` **All fields** `957`\n',
      "#### 12 incompatible fields, 11 fields with mappings in the same family\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.6.1.\n\nIncompatible fields with mappings in the same family have exactly the same search behavior but may have different space usage or performance characteristics.\n\nWhen an incompatible field is not in the same family:\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
      '\n#### Incompatible field mappings - auditbeat-7.9.3-2023.02.13-000001\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| error.message | `match_only_text` | `text` `same family` |\n| error.stack_trace | `wildcard` | `keyword` `same family` |\n| http.request.body.content | `wildcard` | `keyword` `same family` |\n| http.response.body.content | `wildcard` | `keyword` `same family` |\n| message | `match_only_text` | `text` `same family` |\n| process.command_line | `wildcard` | `keyword` `same family` |\n| process.parent.command_line | `wildcard` | `keyword` `same family` |\n| registry.data.strings | `wildcard` | `keyword` `same family` |\n| url.full | `wildcard` | `keyword` `same family` |\n| url.original | `wildcard` | `keyword` `same family` |\n| url.path | `wildcard` | `keyword` `same family` |\n\n#### Incompatible field values - auditbeat-7.9.3-2023.02.13-000001\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.kind | `alert`, `enrichment`, `event`, `metric`, `state`, `pipeline_error`, `signal` | `error` (7) |\n\n',
    ],
    pattern: 'auditbeat-*',
  },
};
