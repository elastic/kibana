/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { CoreStart } from '@kbn/core/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { aiAssistantCapabilities } from '@kbn/observability-ai-assistant-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

export function RedirectToHomeIfUnauthorized({
  coreStart,
  cloud,
  children,
}: {
  coreStart: CoreStart;
  cloud?: CloudStart;
  children: ReactNode;
}) {
  const {
    application: { capabilities, navigateToApp },
    settings,
  } = coreStart;

  const chatExperience$ = useMemo(
    () => settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE),
    [settings.client]
  );
  const chatExperience = useObservable(chatExperience$, AIChatExperience.Classic);
  const isServerlessSearchSolution =
    cloud?.isServerlessEnabled && cloud?.serverless?.projectType === 'search';

  const allowed =
    (capabilities?.observabilityAIAssistant?.[aiAssistantCapabilities.show] ?? false) &&
    chatExperience !== AIChatExperience.Agent;

  useEffect(() => {
    if (!allowed) {
      if (isServerlessSearchSolution) {
        navigateToApp('searchHomepage');
      } else {
        navigateToApp('home');
      }
    }
  }, [allowed, navigateToApp, isServerlessSearchSolution]);

  if (!allowed) return null;

  return <>{children}</>;
}
