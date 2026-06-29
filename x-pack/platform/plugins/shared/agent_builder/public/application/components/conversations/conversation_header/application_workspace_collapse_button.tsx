/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useIsAgentWorkspaceMount } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';

const labels = {
  hideWorkspace: i18n.translate(
    'xpack.agentBuilder.conversationHeader.applicationWorkspaceCollapse.hideWorkspace',
    {
      defaultMessage: 'Hide workspace',
    }
  ),
};

export const ApplicationWorkspaceCollapseButton: React.FC = () => {
  const { isEmbeddedContext } = useConversationContext();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const {
    services: { chrome },
  } = useKibana();

  const isApplicationWorkspaceOpen$ = useMemo(
    () => chrome.applicationWorkspace.getIsOpen$(),
    [chrome]
  );
  const isApplicationWorkspaceOpen = useObservable(
    isApplicationWorkspaceOpen$,
    chrome.applicationWorkspace.getIsOpen()
  );

  const handleCollapse = useCallback(() => {
    chrome.applicationWorkspace.close();
  }, [chrome]);

  if (!isAgentWorkspaceMount || isEmbeddedContext || !isApplicationWorkspaceOpen) {
    return null;
  }

  return (
    <EuiToolTip content={labels.hideWorkspace} disableScreenReaderOutput>
      <EuiButtonIcon
        color="text"
        iconType="transitionLeftIn"
        size="xs"
        aria-label={labels.hideWorkspace}
        aria-expanded={true}
        data-test-subj="agentBuilderApplicationWorkspaceCollapseButton"
        onClick={handleCollapse}
      />
    </EuiToolTip>
  );
};
