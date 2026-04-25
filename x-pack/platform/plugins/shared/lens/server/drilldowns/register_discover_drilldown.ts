/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import {
  DISCOVER_DRILLDOWN_SUPPORTED_TRIGGERS,
  DISCOVER_DRILLDOWN_TYPE,
} from '../../common/constants';

export const discoverDrilldownSchema = schema.object({
  open_in_new_tab: schema.boolean({
    defaultValue: true,
  }),
});

export function registerDiscoverDrilldown(embeddableSetup: EmbeddableSetup) {
  embeddableSetup.registerDrilldown(DISCOVER_DRILLDOWN_TYPE, {
    schema: discoverDrilldownSchema,
    supportedTriggers: DISCOVER_DRILLDOWN_SUPPORTED_TRIGGERS,
  });
}
