/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { BackgroundActivityGate, BackgroundActivityGateResult } from '../../types';

const NOT_BLOCKED: BackgroundActivityGateResult = { blocked: false };

export interface BackgroundActivityGateRegistry {
  register: (gate: BackgroundActivityGate) => void;
  /**
   * True when any registered gate reports blocked. A gate that throws is treated
   * as not blocking: a broken host feature should not make memory unusable.
   */
  check: () => Promise<BackgroundActivityGateResult>;
}

export const createBackgroundActivityGateRegistry = ({
  logger,
}: {
  logger: Logger;
}): BackgroundActivityGateRegistry => {
  const gates: BackgroundActivityGate[] = [];

  return {
    register: (gate) => {
      gates.push(gate);
    },
    check: async () => {
      for (const gate of gates) {
        try {
          const result = await gate();
          if (result.blocked) {
            return result;
          }
        } catch (error) {
          logger.warn(
            `A background activity gate threw and was ignored: ${(error as Error).message}`
          );
        }
      }
      return NOT_BLOCKED;
    },
  };
};
