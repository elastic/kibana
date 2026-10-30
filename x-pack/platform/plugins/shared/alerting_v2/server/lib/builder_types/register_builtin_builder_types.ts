/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuilderTypeRegistry } from './builder_type_registry';

export const THRESHOLD_BUILDER_TYPE = 'threshold';
export const SEQUENCE_BUILDER_TYPE = 'sequence';

/** Registers the builders Kibana ships. Sequence has no create card; it still saves through the API. */
export const registerBuiltinBuilderTypes = (registry: BuilderTypeRegistry): void => {
  registry.register({ type: THRESHOLD_BUILDER_TYPE });
  registry.register({ type: SEQUENCE_BUILDER_TYPE });
};
