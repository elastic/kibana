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
  showWorkspace: i18n.translate(
    'xpack.agentBuilder.conversationHeader.applicationWorkspaceCollapse.showWorkspace',
    {
      defaultMessage: 'Show workspace',
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

  const handleToggle = useCallback(() => {
    if (isApplicationWorkspaceOpen) {
      chrome.applicationWorkspace.close();
      return;
    }

    chrome.applicationWorkspace.open();
  }, [chrome, isApplicationWorkspaceOpen]);

  if (!isAgentWorkspaceMount || isEmbeddedContext) {
    return null;
  }

  const label = isApplicationWorkspaceOpen ? labels.hideWorkspace : labels.showWorkspace;
  const iconType = isApplicationWorkspaceOpen ? 'transitionLeftIn' : 'transitionLeftOut';

  return (
    <EuiToolTip content={label} disableScreenReaderOutput>
      <EuiButtonIcon
        color="text"
        iconType={iconType}
        size="xs"
        aria-label={label}
        aria-expanded={isApplicationWorkspaceOpen}
        data-test-subj="agentBuilderApplicationWorkspaceToggleButton"
        onClick={handleToggle}
      />
    </EuiToolTip>
  );
};
