/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../hooks/use_conversation';
import { ActivityLogFlyout } from './activity_log_flyout';
import { isListedActivityEvent } from './to_activity_items';

const labels = {
  activityLog: i18n.translate('xpack.agentBuilder.conversationActions.activityLog', {
    defaultMessage: 'Activity log',
  }),
  noActivityTooltip: i18n.translate(
    'xpack.agentBuilder.conversationActions.activityLogNoActivityTooltip',
    {
      defaultMessage: 'No activity has been recorded for this conversation.',
    }
  ),
};

export const useActivityLogMenuItem = ({ onSelect }: { onSelect: () => void }) => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useEffect(() => {
    setIsFlyoutOpen(false);
  }, [conversationId]);

  const hasActivity = useMemo(
    () => Boolean(conversation?.events?.some(isListedActivityEvent)),
    [conversation?.events]
  );

  const menuItem = (
    <EuiContextMenuItem
      key="activity-log"
      icon="timeline"
      disabled={!hasActivity}
      toolTipContent={hasActivity ? undefined : labels.noActivityTooltip}
      data-test-subj="agentBuilderActivityLogMenuItem"
      onClick={() => {
        onSelect();
        setIsFlyoutOpen(true);
      }}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_ACTIVITY_LOG,
        detail: 'conversation',
      })}
    >
      {labels.activityLog}
    </EuiContextMenuItem>
  );

  const flyout = isFlyoutOpen ? <ActivityLogFlyout onClose={() => setIsFlyoutOpen(false)} /> : null;

  return { menuItem, flyout };
};
