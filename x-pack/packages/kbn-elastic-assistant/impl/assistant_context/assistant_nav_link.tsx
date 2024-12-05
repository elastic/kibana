/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createHtmlPortalNode, OutPortal, InPortal } from 'react-reverse-portal';
import { ChromeNavControls } from '@kbn/core/public';
import { EuiToolTip, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AssistantAvatar } from '../..';
import { UseAssistantContext } from '.';

interface Props {
  hasAssistantPrivilege: UseAssistantContext['assistantAvailability']['hasAssistantPrivilege'];
  navControls: ChromeNavControls;
  showAssistantOverlay: UseAssistantContext['showAssistantOverlay'];
}

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;

const TOOLTIP_CONTENT = i18n.translate(
  'xpack.elasticAssistant.assistantContext.assistantNavLinkShortcutTooltip',
  {
    values: { keyboardShortcut: isMac ? '⌘ ;' : 'Ctrl ;' },
    defaultMessage: 'Keyboard shortcut {keyboardShortcut}',
  }
);
const LINK_LABEL = i18n.translate('xpack.elasticAssistant.assistantContext.assistantNavLink', {
  defaultMessage: 'AI Assistant',
});

export const AssistantNavLink: FC<Props> = ({
  showAssistantOverlay,
  hasAssistantPrivilege,
  navControls,
}) => {
  const portalNode = React.useMemo(() => createHtmlPortalNode(), []);

  useEffect(() => {
    const registerPortalNode = () => {
      navControls.registerRight({
        mount: (element: HTMLElement) => {
          ReactDOM.render(<OutPortal node={portalNode} />, element);
          return () => ReactDOM.unmountComponentAtNode(element);
        },
        // right before the user profile
        order: 1001,
      });
    };

    registerPortalNode();
  }, [navControls, portalNode]);

  const showOverlay = useCallback(
    () => showAssistantOverlay({ showOverlay: true }),
    [showAssistantOverlay]
  );

  if (!hasAssistantPrivilege) {
    return null;
  }

  return (
    <InPortal node={portalNode}>
      <EuiToolTip content={TOOLTIP_CONTENT}>
        <EuiButton
          onClick={showOverlay}
          color="primary"
          fill
          size="s"
          data-test-subj="assistantNavLink"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <AssistantAvatar size="xs" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{LINK_LABEL}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiButton>
      </EuiToolTip>
    </InPortal>
  );
};
