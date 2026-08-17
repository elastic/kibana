/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiPortal } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
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
  // Single-column catalog; wide enough for title + one-line description.
  width: 'min(520px, calc(100vw - 48px))',
  overflow: 'hidden',
});

const hiddenCss = css({
  display: 'none',
});

export const ActionsMenuPopover = React.memo(function ActionsMenuPopover({
  options,
  testSubjPrefix,
  onActionSelected,
  onConfigure,
  isHidden,
  closePopover,
  isOpen,
  presentation = 'full',
}: ActionsMenuPopoverProps) {
  const didFocusOnOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      didFocusOnOpenRef.current = false;
      return;
    }
    if (isHidden || didFocusOnOpenRef.current) {
      return;
    }
    didFocusOnOpenRef.current = true;
    const id = window.requestAnimationFrame(() => {
      const el = document.querySelector(
        "input[name='cases-actions-menu-search']"
      ) as HTMLInputElement | null;
      el?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen, isHidden]);

  if (!isOpen) return null;

  return (
    <EuiPortal>
      <div
        css={[backdropCss, isHidden && hiddenCss]}
        onClick={closePopover}
        data-test-subj={`${testSubjPrefix}Backdrop`}
        aria-hidden
      />
      <EuiPanel
        paddingSize="none"
        hasShadow
        css={[panelCss, isHidden && hiddenCss]}
        aria-hidden={isHidden || undefined}
      >
        <ActionsMenu
          options={options}
          testSubjPrefix={testSubjPrefix}
          onActionSelected={onActionSelected}
          onConfigure={onConfigure}
          onClose={closePopover}
          presentation={presentation}
          isHidden={isHidden}
        />
      </EuiPanel>
    </EuiPortal>
  );
});

ActionsMenuPopover.displayName = 'ActionsMenuPopover';
