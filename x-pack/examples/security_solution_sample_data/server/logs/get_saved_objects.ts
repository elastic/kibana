/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint max-len: 0 */

import { SavedObject } from '@kbn/core/server';

export const getSavedObjects = (): SavedObject[] => [
  {
    "attributes": {
      "allowHidden": false,
      "fieldAttrs": "{}",
      "fieldFormatMap": "{}",
      "fields": "[]",
      "name": "kibana_sample_data_security-solution-logs",
      "runtimeFieldMap": "{}",
      "sourceFilters": "[]",
      "timeFieldName": "@timestamp",
      "title": "kibana_sample_data_security-solution-logs"
    },
    "coreMigrationVersion": "8.8.0",
    "created_at": "2024-05-07T16:40:04.120Z",
    "created_by": "u_xDIFYa5JaYxK8Xt95kp-2z2IaJ46I1MjZU2Emj0oDSA_0",
    "id": "7c532b57-d14f-42f2-a6a3-c8fde6af4522",
    "managed": false,
    "references": [],
    "type": "index-pattern",
    "typeMigrationVersion": "8.0.0",
    "updated_at": "2024-05-07T16:40:04.120Z",
    "version": "WzYwNiwzXQ=="
  },
  {
    "id": "e0e5758b-18e0-4d1e-ad9e-b9e84bc8d4a2",
    "type": "dashboard",
    "namespaces": [
      "default"
    ],
    "updated_at": "2024-05-08T15:13:06.392Z",
    "created_at": "2024-05-08T15:13:06.392Z",
    "created_by": "u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0",
    "version": "WzM2LDFd",
    "attributes": {
      "version": 2,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"kuery\"},\"filter\":[]}"
      },
      "description": "",
      "timeRestore": false,
      "optionsJSON": "{\"useMargins\":true,\"syncColors\":false,\"syncCursor\":true,\"syncTooltips\":false,\"hidePanelTitles\":false}",
      "panelsJSON": "[]",
      "title": "empty dashboard"
    },
    "references": [],
    "managed": false,
    "coreMigrationVersion": "8.8.0",
    "typeMigrationVersion": "10.2.0"
  }
];