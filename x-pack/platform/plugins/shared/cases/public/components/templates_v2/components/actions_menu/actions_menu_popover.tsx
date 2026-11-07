/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFocusTrap, EuiPanel, EuiPortal } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { ActionsMenu, ACTIONS_MENU_SEARCH_INPUT_NAME } from './actions_menu';
import type { ActionsMenuProps } from './actions_menu';
import * as i18n from '../../translations';

interface ActionsMenuPopoverProps extends ActionsMenuProps {
  isOpen: boolean;
  closePopover: () => void;
}

const MENU_WIDTH = 520;

const componentStyles = {
  backdrop: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      inset: 0,
      zIndex: euiTheme.levels.mask,
    }),
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: Number(euiTheme.levels.mask) + 1,
      // Single-column catalog; wide enough for title + one-line description.
      width: `min(${MENU_WIDTH}px, calc(100vw - ${euiTheme.size.xxl}))`,
      overflow: 'hidden',
    }),
  hidden: css({
    display: 'none',
  }),
};

export const ActionsMenuPopover = React.memo(function ActionsMenuPopover({
  options,
  testSubjPrefix,
  onActionSelected,
  onConfigure,
  isHidden = false,
  closePopover,
  isOpen,
  presentation = 'full',
}: ActionsMenuPopoverProps) {
  const styles = useMemoCss(componentStyles);

  if (!isOpen) return null;

  return (
    <EuiPortal>
      <div
        css={[styles.backdrop, isHidden && styles.hidden]}
        onClick={closePopover}
        data-test-subj={`${testSubjPrefix}Backdrop`}
        aria-hidden
      />
      {/* returnFocus is off because closing always hands focus back to the editor itself. The
          trap is disabled while Configure and add's modal (with its own trap) is open. */}
      <EuiFocusTrap
        disabled={isHidden}
        returnFocus={false}
        clickOutsideDisables={false}
        initialFocus={`input[name="${ACTIONS_MENU_SEARCH_INPUT_NAME}"]`}
        data-test-subj={`${testSubjPrefix}FocusTrap`}
      >
        <EuiPanel
          paddingSize="none"
          hasShadow
          role="dialog"
          aria-modal="true"
          aria-label={i18n.ACTIONS_MENU_DIALOG_ARIA}
          css={[styles.panel, isHidden && styles.hidden]}
          aria-hidden={isHidden || undefined}
          data-test-subj={`${testSubjPrefix}Dialog`}
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
      </EuiFocusTrap>
    </EuiPortal>
  );
});

ActionsMenuPopover.displayName = 'ActionsMenuPopover';
