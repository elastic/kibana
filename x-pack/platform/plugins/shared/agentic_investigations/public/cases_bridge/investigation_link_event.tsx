/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { fetchLinkedInvestigations } from './api';
import { ATTACHMENT, RELATED } from './translations';

/**
 * The activity row for a linked investigation. The title is read live, so a person who can't open
 * the investigation sees that one was linked, not what it is called.
 */
export const InvestigationLinkEvent: React.FC<{ attachmentId: string; caseId: string }> = ({
  attachmentId,
  caseId,
}) => {
  const { services } = useKibana<CoreStart & { agentBuilder?: AgentBuilderPluginStart }>();
  const { data } = useQuery({
    queryKey: ['agenticInvestigations', 'casesBridge', 'linked', caseId, [attachmentId]],
    queryFn: ({ signal }) => fetchLinkedInvestigations(services.http, [attachmentId], signal),
    // The title rarely changes: one read per row per few minutes, not on every focus.
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const result = data?.[0];

  if (result == null) {
    return <>{ATTACHMENT.linked}</>;
  }
  if (result.status === 'inaccessible') {
    return <>{ATTACHMENT.linkedInaccessible}</>;
  }
  return (
    <>
      {ATTACHMENT.linked}{' '}
      <EuiLink
        onClick={() =>
          void services.agentBuilder?.openConversationDetails({ conversationId: attachmentId })
        }
        data-test-subj="cases-bridge-activity-investigation-link"
      >
        {result.investigation.title || RELATED.untitled}
      </EuiLink>
    </>
  );
};
