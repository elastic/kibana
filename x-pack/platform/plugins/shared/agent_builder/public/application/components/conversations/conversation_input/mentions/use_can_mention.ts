/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExperimentalFeatures } from '../../../../hooks/use_experimental_features';
import { useIsSharedConversation } from '../../../../hooks/use_conversation';

/**
 * Mentions need people to talk to, so they only work in a shared chat, behind the experimental flag.
 */
export const useCanMention = (): boolean => {
  const isExperimentalEnabled = useExperimentalFeatures();
  const isShared = useIsSharedConversation();
  return isExperimentalEnabled && isShared;
};
