/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { processorEventSchema } from './processor_event';

describe('processorEventSchema', () => {
  it('accepts transaction/error/metric/span', () => {
    expectParseSuccess(processorEventSchema.safeParse(ProcessorEvent.transaction));
    expectParseSuccess(processorEventSchema.safeParse(ProcessorEvent.error));
    expectParseSuccess(processorEventSchema.safeParse(ProcessorEvent.metric));
    expectParseSuccess(processorEventSchema.safeParse(ProcessorEvent.span));
  });

  it('rejects an unknown processor event', () => {
    expectParseError(processorEventSchema.safeParse('profile'));
  });
});
