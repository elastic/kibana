/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { SubAgentExecutionFlyout } from '../flyouts/sub_agent_execution_flyout';

const buttonLabel = i18n.translate('xpack.agentBuilder.roundEvents.results.viewExecution', {
  defaultMessage: 'View execution',
});

interface ViewExecutionButtonProps {
  executionId: string;
  params?: Record<string, unknown>;
}

export const ViewExecutionButton: React.FC<ViewExecutionButtonProps> = ({
  executionId,
  params,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiButton
        iconType="popout"
        size="s"
        color="text"
        onClick={() => setIsOpen(true)}
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.VIEW_SUB_AGENT_EXECUTION,
          detail: 'conversation',
        })}
      >
        {buttonLabel}
      </EuiButton>
      {isOpen && (
        <SubAgentExecutionFlyout
          executionId={executionId}
          params={params}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
