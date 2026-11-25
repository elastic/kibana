/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import type { ApplicationStart } from '@kbn/core/public';
import { createOpenInChat } from '../../hooks/use_open_in_chat';

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
  const { getChatHref, openChat } = createOpenInChat(application);

  return (
    <EuiLink
      href={getChatHref(conversationId, agentId)}
      onClick={(e: React.MouseEvent) => {
        // Let modified clicks (new tab, new window) use the browser's default behaviour.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        e.preventDefault();
        openChat(conversationId, agentId);
      }}
      data-test-subj="escalationEventInvestigationLink"
    >
      {title}
    </EuiLink>
  );
};
