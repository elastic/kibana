/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SoRegistration } from './local_saved_objects';

export const registrations: SoRegistration = {
  revision: 'fixture-v2',
  types: [
    {
      name: 'wir_t7p_fixture',
      hidden: true,
      namespaceType: 'single',
      mappings: { dynamic: false, properties: {} },
      modelVersions: {
        1: { changes: [] },
        2: {
          changes: [
            {
              type: 'data_backfill',
              backfillFn: (document) => ({
                attributes: { ...document.attributes, migrated: true },
              }),
            },
          ],
        },
      },
    },
  ],
  encryptedTypes: [
    {
      type: 'wir_t7p_fixture',
      attributesToEncrypt: new Set(['secret']),
      attributesToIncludeInAAD: new Set(['stable']),
    },
  ],
};
