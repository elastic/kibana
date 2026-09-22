/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActionSource } from '../../../common/types/domain';
import { isHeaderActionSource } from '../../../common/types/domain';
import { useKibana } from '../../common/lib/kibana';
import { getActionSourceKindLabel } from './translations';
import { useCanOpenAgentConversation } from './use_can_open_agent_conversation';

const WORKFLOWS_APP_ID = 'workflows';

const SourcePrefix: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <span data-test-subj="user-action-via-source">{children}</span>
);
SourcePrefix.displayName = 'SourcePrefix';

const SourceLink: React.FC<{
  href?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  children?: React.ReactNode;
}> = ({ href, onClick, children }) => {
  if (href) {
    return (
      <EuiLink href={href} target="_blank" data-test-subj="user-action-via-source-link">
        {children}
      </EuiLink>
    );
  }

  if (onClick) {
    return (
      <EuiLink onClick={onClick} data-test-subj="user-action-via-source-link">
        {children}
      </EuiLink>
    );
  }

  return <>{children}</>;
};
SourceLink.displayName = 'SourceLink';

type UiActionSource = ActionSource & { runId?: string };

const getSourceRunId = (source: UiActionSource): string | undefined => {
  const runId = source.runId?.trim() || source.run_id?.trim();
  return runId && runId.length > 0 ? runId : undefined;
};

const getSourceDisplayLabel = (source: UiActionSource): string => {
  const name = source.name?.trim();
  return name && name.length > 0 ? name : getActionSourceKindLabel(source.type);
};

const getWorkflowHref = (
  getUrlForApp: ((appId: string, options?: { path?: string }) => string) | undefined,
  workflowId: string,
  runId?: string
): string | undefined => {
  if (getUrlForApp == null || workflowId.length === 0) {
    return undefined;
  }

  const path = runId
    ? `/${encodeURIComponent(workflowId)}?tab=executions&executionId=${encodeURIComponent(runId)}`
    : `/${encodeURIComponent(workflowId)}`;

  const href = getUrlForApp(WORKFLOWS_APP_ID, { path });
  return href.length > 0 ? href : undefined;
};

interface ActionSourceEventProps {
  event: EuiCommentProps['event'];
  source: UiActionSource;
}

const ActionSourceEvent: React.FC<ActionSourceEventProps> = ({ event, source }) => {
  const { agentBuilder, application } = useKibana().services;
  const runId = getSourceRunId(source);
  const canOpenConversation = useCanOpenAgentConversation(
    source.type === 'agent' ? runId : undefined
  );
  const canReadWorkflow = application?.capabilities?.workflowsManagement?.readWorkflow === true;
  const workflowHref = useMemo(
    () =>
      source.type === 'workflow' && canReadWorkflow
        ? getWorkflowHref(application?.getUrlForApp, source.id, runId)
        : undefined,
    [application?.getUrlForApp, canReadWorkflow, runId, source.id, source.type]
  );

  const onOpenConversation = useCallback<
    React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
  >(
    (clickEvent) => {
      clickEvent.preventDefault();
      const openChat = agentBuilder?.openChat;
      if (!canOpenConversation || runId == null || openChat == null) {
        return;
      }

      openChat({
        agentId: source.id,
        conversationId: runId,
      });
    },
    [agentBuilder, canOpenConversation, runId, source.id]
  );

  const label = getSourceDisplayLabel(source);

  return (
    <FormattedMessage
      id="xpack.cases.caseView.userActions.eventWithSourceLabel"
      defaultMessage="<sourcePrefix>via <sourceLink>{label}</sourceLink> </sourcePrefix>{event}"
      values={{
        event,
        label,
        sourcePrefix: (chunks) => <SourcePrefix>{chunks}</SourcePrefix>,
        sourceLink: (chunks) => (
          <SourceLink
            href={workflowHref}
            onClick={canOpenConversation ? onOpenConversation : undefined}
          >
            {chunks}
          </SourceLink>
        ),
      }}
    />
  );
};
ActionSourceEvent.displayName = 'ActionSourceEvent';

export const withActionSourceEvent = (
  event: EuiCommentProps['event'],
  source: unknown
): EuiCommentProps['event'] => {
  if (!isHeaderActionSource(source)) {
    return event;
  }

  return <ActionSourceEvent event={event} source={source} />;
};
