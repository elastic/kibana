/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { isPlainObject } from 'lodash';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import {
  byValueComparator,
  timeRangeComparators,
  titleComparators,
} from '@kbn/presentation-publishing';
import { drilldownsComparators } from '@kbn/embeddable-plugin/common';
import type { LensSerializedSharedState, LensSharedProps } from '@kbn/lens-common';
import type {
  LensByValuePanelConfigs,
  LensByValueSerializedAPIConfig,
  LensWireAPIConfig,
} from '@kbn/lens-common-2';
import { isFlattenedAPIConfig, unflattenAPIConfig } from './transforms/utils';

type LensComparedState = LensSerializedSharedState &
  LensByValuePanelConfigs &
  Pick<LensSharedProps, 'noPadding'> & {
    attributes?: LensByValueSerializedAPIConfig['attributes'];
    ref_id?: string;
  };

/**
 * Drops object keys holding `undefined`, which are lost once state is persisted as JSON.
 */
const omitUndefinedKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedKeys);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, omitUndefinedKeys(entryValue)])
    );
  }
  return value;
};

/**
 * Returns the attributes of a by-value Lens state, either nested or in the flattened API shape.
 */
const resolveAttributes = (
  value: LensComparedState['attributes'],
  state?: LensWireAPIConfig
): LensComparedState['attributes'] => {
  if (value !== undefined) return value;
  if (state && 'attributes' in state && state.attributes) {
    return state.attributes as LensComparedState['attributes'];
  }
  if (state && isFlattenedAPIConfig(state)) {
    return unflattenAPIConfig(state).attributes;
  }
  return value;
};

export const lensStateComparison: SerializedStateComparison<LensComparedState> = {
  comparators: {
    ...titleComparators,
    ...timeRangeComparators,
    ...drilldownsComparators,
    attributes: byValueComparator((lastValue, currentValue, lastState, currentState) =>
      deepEqual(
        omitUndefinedKeys(resolveAttributes(lastValue, lastState as LensWireAPIConfig)),
        omitUndefinedKeys(resolveAttributes(currentValue, currentState as LensWireAPIConfig))
      )
    ),
    ref_id: 'referenceEquality',
    disableTriggers: 'referenceEquality',
    overrides: 'deepEquality',
    references: 'skip',
    isNewPanel: 'skip',
    // runtime-only props, inherited from the container or passed by the Lens component
    id: 'skip',
    palette: 'skip',
    renderMode: 'skip',
    syncColors: 'skip',
    syncCursor: 'skip',
    syncTooltips: 'skip',
    executionContext: 'skip',
    noPadding: 'skip',
    viewMode: 'skip',
    style: 'skip',
    className: 'skip',
    forceDSL: 'skip',
    esqlVariables: 'skip',
    isApproximate: 'skip',
    query: 'skip',
    filters: 'skip',
    timeslice: 'skip',
    searchSessionId: 'skip',
    lastReloadRequestTime: 'skip',
  },
};
