/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import uuid from 'uuid';

export const tracingSpanRT = rt.type({
  duration: rt.number,
  id: rt.string,
  name: rt.string,
  start: rt.number,
  parentId: rt.union([rt.string, rt.null]),
});
export type TracingSpan = rt.TypeOf<typeof tracingSpanRT>;

export const startTracingSpan = (name: string, parentId: string | null = null) => {
  const initialState: TracingSpan = {
    duration: Number.POSITIVE_INFINITY,
    id: uuid.v4(),
    name,
    parentId,
    start: Date.now(),
  };

  const tracingSpan = {
    stop: () => {
      tracingSpan.state = {
        ...tracingSpan.state,
        duration: Date.now() - initialState.start,
      };

      return tracingSpan;
    },
    startChild: (childSpanName: string) => startTracingSpan(childSpanName, initialState.id),
    state: initialState,
  };

  return tracingSpan;
};
