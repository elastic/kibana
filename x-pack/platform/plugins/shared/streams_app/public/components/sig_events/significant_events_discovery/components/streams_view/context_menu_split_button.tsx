/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiContextMenu,
  EuiSplitButton,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';

export interface MenuHelpers {
  resetMenu: () => void;
  closeMenu: () => void;
}

interface ContextMenuSplitButtonProps {
  primaryLabel: React.ReactNode;
  primaryIconType?: string;
  onPrimaryClick: () => void;
  isPrimaryDisabled?: boolean;
  primaryDataTestSubj?: string;

  secondaryAriaLabel: string;
  isSecondaryDisabled?: boolean;
  secondaryDataTestSubj?: string;

  buildPanels: (helpers: MenuHelpers) => EuiContextMenuPanelDescriptor[];

  error?: Error;
  errorTitle?: string;

  color?: ComponentProps<typeof EuiSplitButton>['color'];
  isLoading?: boolean;
  'data-test-subj'?: string;
}

export const ContextMenuSplitButton = ({
  primaryLabel,
  primaryIconType,
  onPrimaryClick,
  isPrimaryDisabled,
  primaryDataTestSubj,
  secondaryAriaLabel,
  isSecondaryDisabled,
  secondaryDataTestSubj,
  buildPanels,
  error,
  errorTitle,
  color,
  isLoading,
  'data-test-subj': dataTestSubj,
}: ContextMenuSplitButtonProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const [menuResetKey, setMenuResetKey] = useState(0);
  const popoverId = useGeneratedHtmlId({ prefix: 'contextMenuSplitButton' });

  const resetMenu = useCallback(() => setMenuResetKey((k) => k + 1), []);

  const closeMenu = useCallback(() => {
    close();
    resetMenu();
  }, [close, resetMenu]);

  const panels = useMemo(
    () => buildPanels({ resetMenu, closeMenu }),
    [buildPanels, resetMenu, closeMenu]
  );

  return (
    <EuiSplitButton size="m" color={color} isLoading={isLoading} data-test-subj={dataTestSubj}>
      <EuiSplitButton.ActionPrimary
        onClick={onPrimaryClick}
        isDisabled={isPrimaryDisabled}
        iconType={primaryIconType}
        data-test-subj={primaryDataTestSubj}
      >
        {primaryLabel}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label={secondaryAriaLabel}
        isDisabled={isSecondaryDisabled}
        data-test-subj={secondaryDataTestSubj}
        onClick={toggle}
        popoverProps={{
          id: popoverId,
          isOpen,
          closePopover: closeMenu,
          anchorPosition: 'downRight',
          panelPaddingSize: 'none',
          children: error ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={errorTitle}
              css={{ margin: euiTheme.size.s }}
            />
          ) : (
            <EuiContextMenu key={menuResetKey} initialPanelId={0} panels={panels} />
          ),
        }}
      />
    </EuiSplitButton>
  );
};
