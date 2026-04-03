/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiShowFor,
  EuiToolTip,
  EuiWindowEvent,
} from '@elastic/eui';

import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { isMac } from '@kbn/shared-ux-utility';
import type { ApplicationStart, ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from '../../types';
import { useUiPrivileges } from '../../application/hooks/use_ui_privileges';
import { AGENTBUILDER_APP_ID } from '../../../common/features';

const DISPLAY_MODE_STORAGE_KEY = 'kibana:agentBuilder:displayMode';

const readStoredExperience = (): AIChatExperience => {
  try {
    const stored = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
    if (
      stored === AIChatExperience.Agent ||
      stored === AIChatExperience.Classic ||
      stored === AIChatExperience.Off
    ) {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings)
  }
  return AIChatExperience.Classic;
};

const writeStoredExperience = (experience: AIChatExperience): void => {
  try {
    localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, experience);
  } catch {
    // ignore
  }
};

const isSemicolon = (event: KeyboardEvent) => event.code === 'Semicolon' || event.key === ';';

interface AgentBuilderNavControlServices {
  agentBuilder: AgentBuilderPluginStart;
  aiAssistantManagementSelection: AgentBuilderStartDependencies['aiAssistantManagementSelection'];
  application: ApplicationStart;
  chrome: ChromeStart;
}

export function AgentBuilderNavControl() {
  const {
    services: { agentBuilder, aiAssistantManagementSelection, application, chrome },
  } = useKibana<AgentBuilderNavControlServices>();

  const { show: hasShowPrivilege } = useUiPrivileges();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<EuiToolTip>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedExperience, setSelectedExperience] =
    useState<AIChatExperience>(readStoredExperience);
  const [sidebarSide, setSidebarSideState] = useState<'left' | 'right'>(() =>
    chrome.sidebar.getSidebarSide()
  );
  const [currentAppId, setCurrentAppId] = useState<string | undefined>(undefined);
  // Track whether the initial "Chat first" auto-open has fired so it only happens once per mount.
  const didAutoOpen = useRef(false);

  const handleExperienceChange = useCallback(
    (id: string) => {
      const experience = id as AIChatExperience;
      setSelectedExperience(experience);
      setIsPopoverOpen(false);
      writeStoredExperience(experience);

      if (experience === AIChatExperience.Agent) {
        // Navigate to Agent Builder as a full-screen dedicated app.
        // Close the sidebar first so both the app and sidebar aren't open simultaneously.
        if (chrome.sidebar.isOpen()) {
          agentBuilder.toggleChat();
        }
        application.navigateToApp(AGENTBUILDER_APP_ID, { path: '/conversations/new' });
      } else if (experience === AIChatExperience.Off) {
        // Use toggleChat (not chrome.sidebar.close) so the plugin clears its internal
        // activeSidebarRef — otherwise subsequent openChat() calls won't reopen the sidebar.
        // Guard with isOpen() so pressing "Off" repeatedly is a no-op.
        if (chrome.sidebar.isOpen()) {
          agentBuilder.toggleChat();
        }
        // If the user was in "Chat first" mode navigated into the Agent Builder app,
        // send them back to Home when they turn the chat off.
        if (currentAppId === AGENTBUILDER_APP_ID) {
          application.navigateToApp('home');
        }
      } else {
        agentBuilder.openChat();
      }
    },
    [agentBuilder, application, chrome.sidebar, currentAppId]
  );

  useEffect(() => {
    const sub = application.currentAppId$.subscribe(setCurrentAppId);
    return () => sub.unsubscribe();
  }, [application]);

  const handleSideChange = useCallback(
    (id: string) => {
      const side = id as 'left' | 'right';
      setSidebarSideState(side);
      chrome.sidebar.setSidebarSide(side);
    },
    [chrome.sidebar]
  );

  useEffect(() => {
    const sub = chrome.sidebar.getCurrentAppId$().subscribe((appId) => {
      const isOpen = appId === 'agentBuilder';
      setIsSidebarOpen((prev) => {
        if (prev && !isOpen) {
          setTooltipVisible(true);
          if (document.activeElement?.matches(':focus-visible')) {
            buttonRef.current?.focus();
          }
        }
        return isOpen;
      });
    });

    return () => sub.unsubscribe();
  }, [chrome.sidebar]);

  // Full-width only applies in Split mode — "Chat first" uses app navigation instead.
  useEffect(() => {
    chrome.sidebar.setFullWidth(false);
  }, [isSidebarOpen, selectedExperience, chrome.sidebar]);

  const handleClick = useCallback(() => {
    tooltipRef.current?.hideToolTip();
    setTooltipVisible(false);
    agentBuilder.toggleChat();
  }, [agentBuilder]);

  useEffect(() => {
    if (!hasShowPrivilege) {
      return;
    }

    const openChatSubscription = aiAssistantManagementSelection.openChat$.subscribe((selection) => {
      if (selection === AIChatExperience.Agent) {
        agentBuilder.openChat();
        aiAssistantManagementSelection.completeOpenChat();
      }
    });

    return () => {
      openChatSubscription.unsubscribe();
    };
  }, [hasShowPrivilege, agentBuilder, aiAssistantManagementSelection]);

  // Restore mode on page load:
  // - "Chat first": navigate to the Agent Builder dedicated app
  // - "Split mode": reopen the sidebar
  // - "Off": do nothing
  useEffect(() => {
    if (!hasShowPrivilege || didAutoOpen.current) {
      return;
    }
    if (selectedExperience === AIChatExperience.Agent) {
      didAutoOpen.current = true;
      application.navigateToApp(AGENTBUILDER_APP_ID, { path: '/conversations' });
    } else if (selectedExperience === AIChatExperience.Classic) {
      didAutoOpen.current = true;
      agentBuilder.openChat();
    }
  }, [hasShowPrivilege, selectedExperience, agentBuilder, application]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isSemicolon(event) && (isMac ? event.metaKey : event.ctrlKey)) {
        event.preventDefault();
        handleClick();
      }
      if (event.key === 'Escape' && isSidebarOpen) {
        setTooltipVisible(true);
        buttonRef.current?.focus();
      }
    },
    [handleClick, isSidebarOpen]
  );

  if (!hasShowPrivilege) {
    return null;
  }

  const fullTooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <span>{buttonLabel}</span>
      <br />
      <span>{shortcutLabel}</span>
    </div>
  );

  const showTooltip = !isSidebarOpen && tooltipVisible && !isPopoverOpen;
  const variant =
    isSidebarOpen || selectedExperience === AIChatExperience.Agent ? 'accent' : 'base';

  const experienceButtonGroup = (
    <EuiButtonGroup
      legend={i18n.translate('xpack.agentBuilder.navControl.chatExperienceLegend', {
        defaultMessage: 'Chat experience',
      })}
      options={[
        {
          id: AIChatExperience.Agent,
          label: i18n.translate('xpack.agentBuilder.navControl.chatFirstLabel', {
            defaultMessage: 'Agent',
          }),
        },
        {
          id: AIChatExperience.Classic,
          label: i18n.translate('xpack.agentBuilder.navControl.classicLabel', {
            defaultMessage: 'Split',
          }),
        },
        {
          id: 'off',
          label: i18n.translate('xpack.agentBuilder.navControl.offLabel', {
            defaultMessage: 'Off',
          }),
        },
      ]}
      idSelected={selectedExperience}
      onChange={handleExperienceChange}
      data-test-subj="AgentBuilderNavControlExperienceButtonGroup"
    />
  );

  const sideButtonGroup = (
    <EuiButtonGroup
      legend={i18n.translate('xpack.agentBuilder.navControl.sidebarSideLegend', {
        defaultMessage: 'Panel position',
      })}
      isDisabled={selectedExperience !== AIChatExperience.Classic}
      options={[
        {
          id: 'left',
          label: i18n.translate('xpack.agentBuilder.navControl.sidebarSideLeftLabel', {
            defaultMessage: 'Left',
          }),
          iconType: 'transitionLeftIn',
        },
        {
          id: 'right',
          label: i18n.translate('xpack.agentBuilder.navControl.sidebarSideRightLabel', {
            defaultMessage: 'Right',
          }),
          iconType: 'transitionLeftOut',
        },
      ]}
      idSelected={sidebarSide}
      onChange={handleSideChange}
      isIconOnly
      data-test-subj="AgentBuilderNavControlSideButtonGroup"
    />
  );

  const textButton = (
    <AiButton
      buttonRef={buttonRef}
      variant={variant}
      size="s"
      iconType="productAgent"
      onClick={() => {
        setIsPopoverOpen((open) => !open);
        setTooltipVisible(false);
      }}
      data-test-subj="AgentBuilderNavControlButton"
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
    >
      <FormattedMessage id="xpack.agentBuilder.navControl.linkLabel" defaultMessage="AI Agent" />
    </AiButton>
  );

  const iconButton = (
    <AiButton
      buttonRef={buttonRef}
      iconOnly
      variant={variant}
      size="s"
      iconType="productAgent"
      onClick={() => {
        setIsPopoverOpen((open) => !open);
        setTooltipVisible(false);
      }}
      aria-label={buttonLabel}
      data-test-subj="AgentBuilderNavControlButtonIcon"
      onMouseLeave={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(true)}
    />
  );

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiShowFor sizes={['m', 'l', 'xl']}>
        <EuiFlexGroup gutterSize="none" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiPopover
              aria-label={i18n.translate(
                'xpack.agentBuilder.navControl.switchExperienceAriaLabel',
                {
                  defaultMessage: 'Switch chat experience',
                }
              )}
              button={textButton}
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="s"
              anchorPosition="downRight"
            >
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem grow={false}>{experienceButtonGroup}</EuiFlexItem>
                {sideButtonGroup && <EuiFlexItem grow={false}>{sideButtonGroup}</EuiFlexItem>}
              </EuiFlexGroup>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiShowFor>

      <EuiShowFor sizes={['xs', 's']}>
        {showTooltip ? (
          <EuiToolTip content={fullTooltipContent} ref={tooltipRef}>
            {iconButton}
          </EuiToolTip>
        ) : (
          iconButton
        )}
      </EuiShowFor>
    </>
  );
}

const buttonLabel = i18n.translate(
  'xpack.agentBuilder.navControl.openTheAgentBuilderSidebarLabel',
  {
    defaultMessage: 'Open Agent Builder',
  }
);

const shortcutLabel = i18n.translate('xpack.agentBuilder.navControl.keyboardShortcutTooltip', {
  values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
  defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
});
