/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';

enum FlyoutPositionMode {
  PUSH = 'push',
  OVERLAY = 'overlay',
}

interface FlyoutState {
  flyoutPositionMode: FlyoutPositionMode;
  isOpen: boolean;
}

export const defaultFlyoutState: FlyoutState = {
  flyoutPositionMode: FlyoutPositionMode.OVERLAY,
  isOpen: false,
};

export const OBSERVABILITY_AI_ASSISTANT_LOCAL_STORAGE_KEY = 'observabilityAIAssistant_flyoutState';

export function useFlyoutState() {
  const [flyoutState = defaultFlyoutState, setFlyoutState, removeFlyoutState] = useLocalStorage(
    OBSERVABILITY_AI_ASSISTANT_LOCAL_STORAGE_KEY,
    defaultFlyoutState
  );
  return { flyoutState, setFlyoutState, removeFlyoutState };
}
