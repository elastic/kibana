/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const configSchema = schema.object({
  /**
   * How Adaptive UI attachments are styled in Agent Builder.
   *
   * Selects the adapter's render surface: `shadow` is the HTML surface (inline
   * CSS) behind a shadow root, so Kibana/EUI rules cannot leak in and nothing
   * inside is interactive. `document` is the React surface in the light DOM,
   * which relies on `@kbn/adaptive-ui/styles.css`.
   */
  styleIsolation: schema.oneOf([schema.literal('shadow'), schema.literal('document')], {
    defaultValue: 'shadow',
  }),
});

export type AdaptiveUiConfig = TypeOf<typeof configSchema>;
export type StyleIsolation = AdaptiveUiConfig['styleIsolation'];
