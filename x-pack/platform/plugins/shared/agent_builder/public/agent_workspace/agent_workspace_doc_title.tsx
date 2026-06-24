/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { AGENT_BUILDER_FULL_TITLE } from '../../common/features';
import { useKibana } from '../application/hooks/use_kibana';
import { useOrchestratedAppId } from '../application/hooks/use_navigation';

/**
 * Sets a combined document title for agent-first dual workspaces (orchestrated app + AB).
 */
export const AgentWorkspaceDocTitle: React.FC = () => {
  const {
    services: { chrome, application },
  } = useKibana();

  const orchestratedAppId = useOrchestratedAppId();
  const applications = useObservable(application.applications$, new Map());

  const orchestratedAppTitle = useMemo(() => {
    if (!orchestratedAppId) {
      return undefined;
    }

    return applications.get(orchestratedAppId)?.title;
  }, [applications, orchestratedAppId]);

  useEffect(() => {
    const titleParts = [orchestratedAppTitle, AGENT_BUILDER_FULL_TITLE].filter(Boolean);

    if (titleParts.length === 0) {
      chrome.docTitle.change(AGENT_BUILDER_FULL_TITLE);
      return;
    }

    chrome.docTitle.change(titleParts.length === 1 ? titleParts[0]! : titleParts);
  }, [chrome.docTitle, orchestratedAppTitle]);

  return null;
};
