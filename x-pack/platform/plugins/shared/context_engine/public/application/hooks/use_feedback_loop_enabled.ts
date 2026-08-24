/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID } from '../../../common/constants';
import { useKibana } from './use_kibana';

/**
 * Reactively reads the global `contextEngine:feedbackLoopEnabled` advanced setting (default false).
 * The Signals feature (generation + this UI) is gated on it, so the panel uses this to avoid
 * rendering a permanently-empty surface when the feedback loop is switched off.
 */
export const useFeedbackLoopEnabled = (): boolean => {
  const {
    services: { settings },
  } = useKibana();

  // Coerced rather than passed through: an unset setting reads back as undefined, and callers feed
  // this to React Query's `enabled`, where undefined means "on" instead of "off".
  const [enabled, setEnabled] = useState<boolean>(() =>
    Boolean(
      settings.globalClient.get<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID, false)
    )
  );

  useEffect(() => {
    const subscription = settings.globalClient
      .get$<boolean>(CONTEXT_ENGINE_FEEDBACK_LOOP_ENABLED_SETTING_ID, false)
      .subscribe((value) => setEnabled(Boolean(value)));
    return () => subscription.unsubscribe();
  }, [settings]);

  return enabled;
};
