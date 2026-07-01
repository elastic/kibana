/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { EuiButtonIcon, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UnifiedSidebarPanel } from './unified_sidebar_panel';
import { SIDEBAR_WIDTH } from './unified_sidebar.constants';

const POPOVER_MAX_HEIGHT = 'min(80vh, 720px)';

const openSidebarLabel = i18n.translate('xpack.agentBuilder.sidebar.popover.openNavigation', {
  defaultMessage: 'Open Agent Builder navigation',
});

export interface SidebarPopoverTriggerProps {
  onToggleCondensed: () => void;
}

export const SidebarPopoverTrigger: React.FC<SidebarPopoverTriggerProps> = ({
  onToggleCondensed,
}) => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const closePopover = useCallback(() => setIsOpen(false), []);

  const switchToPushMode = useCallback(() => {
    setIsOpen(false);
    onToggleCondensed();
  }, [onToggleCondensed]);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      panelStyle={{
        width: SIDEBAR_WIDTH,
        maxHeight: POPOVER_MAX_HEIGHT,
        overflow: 'hidden',
      }}
      button={
        <EuiToolTip content={openSidebarLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType={isOpen ? 'cross' : 'menu'}
            aria-label={openSidebarLabel}
            aria-expanded={isOpen}
            color="text"
            size="s"
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj="agentBuilderSidebarPopoverButton"
          />
        </EuiToolTip>
      }
      data-test-subj="agentBuilderSidebarPopoverTrigger"
    >
      <UnifiedSidebarPanel
        isPopoverMode
        maxHeight={POPOVER_MAX_HEIGHT}
        onToggleCondensed={switchToPushMode}
      />
    </EuiPopover>
  );
};
