/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SOWithMetadata } from '@kbn/content-management-utils';

import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { DeprecatedLegendValueState } from '../v1/transforms/legend_stats/types';
import type { DeprecatedColorMappingsState } from '../v1/transforms/raw_color_mappings/types';

export type DeprecatedV0State = DeprecatedLegendValueState | DeprecatedColorMappingsState;

export type LensAttributesV0 = Omit<LensAttributes, 'version' | 'state'> & {
  version: never; // explicitly set as no version
  state: LensAttributes['state'] | DeprecatedV0State;
};

/**
 * An unversioned Lens item that may or may not include old runtime migrations.
 */
export type LensSavedObjectV0 = SOWithMetadata<LensAttributesV0>;
