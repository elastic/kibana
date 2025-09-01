/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InterruptType, InterruptValue } from '../schemas';
import { InterruptResumeValue } from '../schemas';

/**
 * Light wrapper around the `interrupt` helper method from @langchain/langgraph.
 * Ensures the correct types are used for interrupt values and resume values so that
 * the interrupts are rendered correctly on the frontend.
 */
export const typedInterrupt = <T extends InterruptType>(
  interruptValue: { type: T } & InterruptValue
): { type: T } & InterruptResumeValue => {
  if (typeof window !== 'undefined') {
    throw new Error('typedInterrupt is only available on the server side');
  }

  const { interrupt } = eval('require')('@langchain/langgraph'); // Ensures this is only imported server side.

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

  return parsedResult.data as { type: T } & InterruptResumeValue;
};
