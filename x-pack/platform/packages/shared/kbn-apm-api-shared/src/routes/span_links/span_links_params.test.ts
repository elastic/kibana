/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { linkedParentsRoute } from './linked_parents';
import { linkedChildrenRoute } from './linked_children';
import { spanLinksRoute } from './span_links';

const path = { traceId: 'trace-1', spanId: 'span-1' };
const rangeAndKuery = {
  kuery: '',
  start: '2023-01-01T00:00:00.000Z',
  end: '2023-01-02T00:00:00.000Z',
};

describe('linkedParentsRoute params', () => {
  it('requires processorEvent in the query', () => {
    expectParseError(linkedParentsRoute.params!.safeParse({ path, query: rangeAndKuery }));

    const result = linkedParentsRoute.params!.safeParse({
      path,
      query: { ...rangeAndKuery, processorEvent: ProcessorEvent.span },
    });

    expectParseSuccess(result);
  });
});

describe('linkedChildrenRoute params', () => {
  it('does not declare a processorEvent field', () => {
    expectParseSuccess(linkedChildrenRoute.params!.safeParse({ path, query: rangeAndKuery }));
    // Excess-key rejection (e.g. a stray `processorEvent`) is enforced by
    // `DeepStrict`, applied at route-registration time, not by this schema
    // on its own - see register_apm_server_routes.ts.
  });
});

describe('spanLinksRoute params', () => {
  it('allows omitting processorEvent', () => {
    expectParseSuccess(spanLinksRoute.params!.safeParse({ path, query: rangeAndKuery }));
  });

  it('accepts processorEvent when provided', () => {
    const result = spanLinksRoute.params!.safeParse({
      path,
      query: { ...rangeAndKuery, processorEvent: ProcessorEvent.transaction },
    });

    expectParseSuccess(result);
    expect(result.data.query.processorEvent).toEqual(ProcessorEvent.transaction);
  });

  it('rejects an unknown processorEvent', () => {
    const result = spanLinksRoute.params!.safeParse({
      path,
      query: { ...rangeAndKuery, processorEvent: 'profile' },
    });

    expectParseError(result);
  });
});
