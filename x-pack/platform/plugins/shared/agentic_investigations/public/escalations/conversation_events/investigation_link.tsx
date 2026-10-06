/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';
import { AGENTBUILDER_APP_ID } from '@kbn/agent-builder-plugin/public';

// Opens the conversation details flyout on arrival. Mirrors Agent Builder's
// `searchParamNames.openConversationDetails`, which is not exported.
const OPEN_DETAILS_PARAM = 'openConversationDetails=true';

const conversationPath = (conversationId: string, agentId?: string): string => {
  const base = agentId
    ? `/agents/${encodeURIComponent(agentId)}/conversations/${encodeURIComponent(conversationId)}`
    : // Without an agent id, Agent Builder's legacy route resolves the conversation's own agent
      // and redirects to the canonical URL.
      `/conversations/${encodeURIComponent(conversationId)}`;
  return `${base}?${OPEN_DETAILS_PARAM}`;
};

interface InvestigationLinkProps {
  application: ApplicationStart;
  conversationId: string;
  agentId?: string;
  title: string;
}

/** Title of an investigation, linking to its Agent Builder conversation. */
export const InvestigationLink = ({
  application,
  conversationId,
  agentId,
  title,
}: InvestigationLinkProps) => {
  const path = conversationPath(conversationId, agentId);
  const href = application.getUrlForApp(AGENTBUILDER_APP_ID, { path });

  return (
    <EuiLink
      href={href}
      onClick={(e: React.MouseEvent) => {
        // Let modified clicks (new tab, new window) use the browser's default behaviour.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        e.preventDefault();
        application.navigateToApp(AGENTBUILDER_APP_ID, { path });
      }}
      data-test-subj="escalationEventInvestigationLink"
    >
      {title}
    </EuiLink>
  );
};
