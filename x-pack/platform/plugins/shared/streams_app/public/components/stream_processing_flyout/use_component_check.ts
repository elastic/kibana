/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentValidationRequest } from '@kbn/streams-schema';
import type { ComponentCheck, ComponentChecker } from '../../services/component_catalogue';

export interface ComponentCheckRun {
  /** Whether a check is in flight; the editor is blocked meanwhile. */
  isChecking: boolean;
  /** Runs one check; resolves `undefined` when `stop` was called before it finished. */
  run: (request: ComponentValidationRequest) => Promise<ComponentCheck | undefined>;
  /** Aborts the running check, if any, and unblocks the editor. */
  stop: () => void;
}

/** One component check at a time, aborted on `stop` and when the component unmounts. */
export const useComponentCheck = (checkComponent: ComponentChecker): ComponentCheckRun => {
  const [isChecking, setIsChecking] = useState(false);
  const running = useRef<AbortController>();
  useEffect(() => () => running.current?.abort(), []);

  const stop = useCallback(() => {
    running.current?.abort();
    running.current = undefined;
    setIsChecking(false);
  }, []);

  const run = useCallback(
    async (request: ComponentValidationRequest) => {
      const controller = new AbortController();
      running.current = controller;
      setIsChecking(true);
      const check = await checkComponent(request, controller.signal);
      // `stop` already reset the state when it aborted this run.
      if (controller.signal.aborted) {
        return undefined;
      }
      running.current = undefined;
      setIsChecking(false);
      return check;
    },
    [checkComponent]
  );

  return { isChecking, run, stop };
};
