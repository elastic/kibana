/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSplitButton,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { css } from '@emotion/react';
import { useBoolean } from '@kbn/react-hooks';
import React, { useCallback, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { useModelSettingsUrl } from '../../../../../hooks/use_model_settings_url';
import { MODEL_SETTINGS_LABEL } from './translations';

/**
 * The secondary action is wrapped in `EuiPopover`. The anchor uses styles such as
 * `vertical-align: middle`, so in a split button row it can sit a few pixels off the
 * primary segment. Stretch the popover anchor and match the icon control height.
 */
const splitButtonPopoverAnchorStretchCss = css`
  align-items: stretch;

  & > .euiPopover {
    align-self: stretch;
    display: flex;
    align-items: stretch;
  }

  & > .euiPopover .euiSplitButtonActionSecondary {
    height: 100%;
  }
`;

const modelSettingsMenuName = (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem>{MODEL_SETTINGS_LABEL}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIcon type="popout" size="s" color="subdued" aria-hidden={true} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

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

  buildPanels: (helpers: MenuHelpers) => Array<Omit<EuiContextMenuPanelDescriptor, 'id'>>;

  error?: Error;
  errorTitle?: string;

  color?: ComponentProps<typeof EuiSplitButton>['color'];
  fill?: ComponentProps<typeof EuiSplitButton>['fill'];
  size?: ComponentProps<typeof EuiSplitButton>['size'];
  /** When set, loading spinner appears only on the secondary action (not the primary). */
  isSecondaryLoading?: boolean;
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
  fill,
  size = 'm',
  isSecondaryLoading,
  isLoading,
  'data-test-subj': dataTestSubj,
}: ContextMenuSplitButtonProps) => {
  const splitButtonIsLoading =
    isSecondaryLoading !== undefined ? false : Boolean(isLoading);
  const secondaryIsLoading =
    isSecondaryLoading !== undefined ? Boolean(isSecondaryLoading) : Boolean(isLoading);
  const { euiTheme } = useEuiTheme();
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const [menuResetKey, setMenuResetKey] = useState(0);
  const popoverId = useGeneratedHtmlId({ prefix: 'contextMenuSplitButton' });
  const managementUrl = useModelSettingsUrl();

  const resetMenu = useCallback(() => setMenuResetKey((k) => k + 1), []);

  const closeMenu = useCallback(() => {
    close();
    resetMenu();
  }, [close, resetMenu]);

  const panels = useMemo(() => {
    const builtPanels = buildPanels({ resetMenu, closeMenu });

    const settingsItems = managementUrl
      ? [
          { isSeparator: true as const },
          {
            name: modelSettingsMenuName,
            icon: 'gear' as const,
            href: managementUrl,
            target: '_blank',
            onClick: closeMenu,
          },
        ]
      : [];

    return builtPanels.map((panel, index) => ({
      ...panel,
      id: index,
      ...(index === 0 && panel.items && settingsItems.length > 0
        ? { items: [...panel.items, ...settingsItems] }
        : {}),
    }));
  }, [buildPanels, resetMenu, closeMenu, managementUrl]);

  const popoverContent = error ? (
    <EuiCallOut
      announceOnMount
      color="danger"
      size="s"
      title={errorTitle}
      css={{ margin: euiTheme.size.s }}
    />
  ) : (
    <EuiContextMenu key={menuResetKey} initialPanelId={0} panels={panels} />
  );

  return (
    <EuiSplitButton
      size={size}
      color={color}
      fill={fill}
      isLoading={splitButtonIsLoading}
      data-test-subj={dataTestSubj}
      css={splitButtonPopoverAnchorStretchCss}
    >
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
        isLoading={secondaryIsLoading}
        data-test-subj={secondaryDataTestSubj}
        onClick={toggle}
        popoverProps={{
          id: popoverId,
          isOpen,
          closePopover: closeMenu,
          anchorPosition: 'downRight',
          panelPaddingSize: 'none',
          children: popoverContent,
        }}
      />
    </EuiSplitButton>
  );
};
