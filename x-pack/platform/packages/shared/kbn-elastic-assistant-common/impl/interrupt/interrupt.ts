/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InterruptType, InterruptValue } from '../schemas';
import { InterruptResumeValue } from '../schemas';

// id of the interrupt is created when the graph is interrupted. Therefore, it is not yet available yet.
type InterruptValueWithoutId<T extends InterruptType> = Omit<
  Extract<InterruptValue, { type: T }>,
  'id'
>;

export const typedInterrupt = async <T extends InterruptValue['type'] = InterruptValue['type']>(
  interruptValue: InterruptValueWithoutId<T> & { type: T }
): Promise<Extract<InterruptResumeValue, { type: T }>> => {
  if (typeof window !== 'undefined') {
    throw new Error('typedInterrupt is only available on the server side');
  }

  const { interrupt } = await import('@langchain/langgraph');

  const result = interrupt(interruptValue);

  const parsedResult = InterruptResumeValue.safeParse(result);
  if (!parsedResult.success) {
    throw new Error(`Resume value did not match schema: ${JSON.stringify(parsedResult.error)}`);
  }

  if (parsedResult.data.type !== interruptValue.type) {
    throw new Error(
      `Resume value type mismatch: expected ${interruptValue.type}, got ${parsedResult.data.type}`
    );
  }

  return parsedResult.data as Extract<InterruptResumeValue, { type: T }>;
};
