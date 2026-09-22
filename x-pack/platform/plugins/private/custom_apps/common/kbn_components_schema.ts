/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Catalog schema for the plugin's Kibana-backed components. It lives in
 * `common/` because the server needs it to validate agent output and to build
 * the catalog handed to the agent as its prompt, while the implementations are
 * browser-only.
 */
export const KBN_LENS_PANEL_SCHEMA = {
  type: 'object',
  description:
    'Embeds a Lens visualization. Prefer savedObjectId, which references an existing saved visualization. Use attributes only for a chart that has not been saved.',
  properties: {
    component: { const: 'KbnLensPanel' },
    savedObjectId: {
      type: 'string',
      description: 'The saved object id of an existing Lens visualization.',
    },
    attributes: {
      type: 'object',
      description:
        'Inline Lens attributes for a by-value chart. Large and easy to get wrong; prefer savedObjectId.',
    },
  },
  required: ['component'],
  oneOf: [{ required: ['savedObjectId'] }, { required: ['attributes'] }],
} as const;
