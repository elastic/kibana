/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { createHtmlPortalNode, OutPortal, InPortal } from 'react-reverse-portal';
import { EuiToolTip, EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/security-solution-plugin/public/common/lib/kibana/kibana_react';
import useObservable from 'react-use/lib/useObservable';
import { UseAssistantContext } from '.';
import { AssistantAvatar } from '../..';

interface Props {
  hasAssistantPrivilege: UseAssistantContext['assistantAvailability']['hasAssistantPrivilege'];
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
  hasAssistantPrivilege
}) => {
  const portalNode = React.useMemo(() => createHtmlPortalNode(), []);
  const { chrome } = useKibana().services;
  const { navControls, getChromeStyle$ } = chrome
  const chromeStyle$ = useMemo(() => getChromeStyle$(), [chrome]);
  const chromeStyle = useObservable(chromeStyle$, undefined);

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

  const EuiButtonBasicOrEmpty = chromeStyle === 'project' ? EuiButtonEmpty : EuiButton;

  return (
    <InPortal node={portalNode}>
      <EuiToolTip content={TOOLTIP_CONTENT}>
        <EuiButtonBasicOrEmpty
          onClick={showOverlay}
          color="primary"
          size="s"
          data-test-subj="assistantNavLink"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <AssistantAvatar size="xs" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{LINK_LABEL}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiButtonBasicOrEmpty>
      </EuiToolTip>
    </InPortal>
  );
};
