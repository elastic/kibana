/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import { formatDuration } from '../../shared';
import type { DslStepsFlyoutFormInternal } from './types';
import { MAX_DOWNSAMPLE_STEPS } from './constants';

export const createDslStepsFlyoutSerializer = (initialLifecycle: IngestStreamLifecycleDSL) => {
  return (data: DslStepsFlyoutFormInternal): IngestStreamLifecycleDSL => {
    const next: IngestStreamLifecycleDSL = cloneDeep(initialLifecycle);
    const meta = (data as unknown as Partial<DslStepsFlyoutFormInternal>)?._meta;

    if (!meta) {
      return next;
    }

    const metaSteps = meta.downsampleSteps ?? [];

    const downsample = metaSteps.slice(0, MAX_DOWNSAMPLE_STEPS).map((step) => {
      const after =
        formatDuration(step.afterValue, step.afterUnit, {
          integerOnly: true,
          minInclusive: 0,
        }) ??
        // Should not happen when form is valid, but keep output shape stable for live previews.
        '0s';

      const fixedInterval =
        formatDuration(step.fixedIntervalValue, step.fixedIntervalUnit, {
          integerOnly: true,
          minExclusive: 0,
        }) ??
        // Should not happen when form is valid, but keep output shape stable for live previews.
        '1d';

      // Elasticsearch only accepts `after` and `fixed_interval` per downsampling round.
      return { after, fixed_interval: fixedInterval };
    });

    if (downsample.length === 0) {
      if (next.dsl) {
        delete next.dsl.downsample;
        // Preserve any existing DSL fields, but don't materialize a new empty `dsl` object.
        if (Object.keys(next.dsl).length === 0) {
          delete (next as Partial<IngestStreamLifecycleDSL>).dsl;
        }
      }
    } else {
      next.dsl = { ...(next.dsl ?? {}), downsample };
    }

    return next;
  };
};
