/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiPortal } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect } from 'react';
import { ActionsMenu } from './actions_menu';
import type { ActionsMenuProps } from './actions_menu';

interface ActionsMenuPopoverProps extends ActionsMenuProps {
  isOpen: boolean;
  closePopover: () => void;
}

const backdropCss = css({
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
});

const panelCss = css({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 2001,
  width: '1085px',
  overflow: 'hidden',
});

export const ActionsMenuPopover = React.memo(function ActionsMenuPopover({
  options,
  testSubjPrefix,
  onActionSelected,
  onConfigureAndAdd,
  closePopover,
  isOpen,
}: ActionsMenuPopoverProps) {
  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => {
      const el = document.querySelector(
        "input[name='cases-actions-menu-search']"
      ) as HTMLInputElement | null;
      el?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <EuiPortal>
      <div
        css={backdropCss}
        onClick={closePopover}
        data-test-subj={`${testSubjPrefix}Backdrop`}
        aria-hidden
      />
      <EuiPanel paddingSize="none" hasShadow css={panelCss}>
        <ActionsMenu
          options={options}
          testSubjPrefix={testSubjPrefix}
          onActionSelected={onActionSelected}
          onConfigureAndAdd={onConfigureAndAdd}
          onClose={closePopover}
        />
      </EuiPanel>
    </EuiPortal>
  );
});
