/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import type { DslStepMetaFields, DslStepsFlyoutFormInternal, PreservedTimeUnit } from './types';
import { MAX_DOWNSAMPLE_STEPS } from './constants';
import { parseInterval, toMilliseconds } from './utils';

export const createDslStepsFlyoutDeserializer = () => {
  return (lifecycle: IngestStreamLifecycleDSL): DslStepsFlyoutFormInternal => {
    const steps = lifecycle.dsl?.downsample ?? [];
    const downsampleSteps: DslStepMetaFields[] = steps
      .slice(0, MAX_DOWNSAMPLE_STEPS)
      .map((step) => {
        const parsedAfter = parseInterval(step?.after);
        const afterValue = parsedAfter?.value ?? '';
        const afterUnit = (parsedAfter?.unit ?? 'd') as PreservedTimeUnit;

        const parsedInterval = parseInterval(step?.fixed_interval);
        const fixedIntervalValue = parsedInterval?.value ?? '1';
        const fixedIntervalUnit = (parsedInterval?.unit ?? 'd') as PreservedTimeUnit;

        return {
          afterValue,
          afterUnit,
          afterToMilliSeconds:
            afterValue.trim() === '' ? -1 : toMilliseconds(afterValue, afterUnit),
          fixedIntervalValue,
          fixedIntervalUnit,
        };
      });

    return { _meta: { downsampleSteps } };
  };
};
