/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect } from 'react';
import { EuiButton, EuiToolTip, EuiWindowEvent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { OnechatPluginStart, OnechatStartDependencies } from '../../types';
import { RobotIcon } from '../../application/components/common/icons/robot';
import { useUiPrivileges } from '../../application/hooks/use_ui_privileges';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const isSemicolon = (event: KeyboardEvent) => event.code === 'Semicolon' || event.key === ';';

interface OnechatNavControlServices {
  onechat: OnechatPluginStart;
  aiAssistantManagementSelection: OnechatStartDependencies['aiAssistantManagementSelection'];
}

export function OnechatNavControl() {
  const {
    services: { onechat, aiAssistantManagementSelection },
  } = useKibana<OnechatNavControlServices>();

  const { show: hasShowPrivilege } = useUiPrivileges();

  const toggleFlyout = useCallback(() => {
    onechat.toggleConversationFlyout();
  }, [onechat]);

  useEffect(() => {
    if (!hasShowPrivilege) {
      return;
    }

    const openChatSubscription = aiAssistantManagementSelection.openChat$.subscribe((selection) => {
      if (selection === AIChatExperience.Agent) {
        onechat.openConversationFlyout();
        aiAssistantManagementSelection.completeOpenChat();
      }
    });

    return () => {
      openChatSubscription.unsubscribe();
    };
  }, [hasShowPrivilege, onechat, aiAssistantManagementSelection]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isSemicolon(event) && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        toggleFlyout();
      }
    },
    [toggleFlyout]
  );

  if (!hasShowPrivilege) {
    return null;
  }

  const tooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <span>{buttonLabel}</span>
      <br />
      <span>{shortcutLabel}</span>
    </div>
  );

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiToolTip content={tooltipContent}>
        <EuiButton
          aria-label={buttonLabel}
          data-test-subj="OnechatNavControlButton"
          onClick={() => {
            toggleFlyout();
          }}
          color="primary"
          size="s"
          fullWidth={false}
          minWidth={0}
        >
          <RobotIcon size="m" />
          <FormattedMessage id="xpack.onechat.navControl.linkLabel" defaultMessage="AI Agent" />
        </EuiButton>
      </EuiToolTip>
    </>
  );
}

const buttonLabel = i18n.translate('xpack.onechat.navControl.openTheOnechatFlyoutLabel', {
  defaultMessage: 'Open Agent Builder',
});

const shortcutLabel = i18n.translate('xpack.onechat.navControl.keyboardShortcutTooltip', {
  values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
  defaultMessage: '(Keyboard shortcut {keyboardShortcut})',
});
