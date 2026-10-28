/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiSplitButton,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type ActionButton, ActionButtonType } from '@kbn/agent-builder-browser/attachments';

interface AttachmentActionsProps {
  buttons: ActionButton[];
  iconOnly?: boolean;
}

const MORE_ACTIONS_LABEL = i18n.translate('xpack.agentBuilder.attachmentActions.moreActions', {
  defaultMessage: 'More actions',
});

const MORE_ACTIONS_POPOVER_LABEL = i18n.translate(
  'xpack.agentBuilder.attachmentActions.moreActionsPopover',
  {
    defaultMessage: 'Attachment actions',
  }
);

const getNavProps = (button: ActionButton) => ({
  href: button.href,
  target: button.href && button.openInNewTab ? '_blank' : undefined,
  rel: button.href && button.openInNewTab ? 'noopener noreferrer' : undefined,
  onClick: button.handler,
});

export const AttachmentActions: React.FC<AttachmentActionsProps> = ({
  buttons,
  iconOnly = false,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const mainButton =
    buttons.find(({ type }) => type === ActionButtonType.PRIMARY) ??
    (buttons.length === 1 ? buttons[0] : undefined);
  const menuButtons = buttons.filter((button) => button !== mainButton);

  const menu = useMemo(
    () => (
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            items: menuButtons.map(
              (button): EuiContextMenuPanelItemDescriptor => ({
                name: button.label,
                icon: button.icon,
                disabled: button.disabled,
                toolTipContent: button.disabled ? button.disabledReason : undefined,
                href: button.href,
                target: button.href && button.openInNewTab ? '_blank' : undefined,
                rel: button.href && button.openInNewTab ? 'noopener noreferrer' : undefined,
                onClick: () => {
                  closePopover();
                  button.handler();
                },
              })
            ),
          },
        ]}
      />
    ),
    [menuButtons, closePopover]
  );

  const popoverProps = {
    'aria-label': MORE_ACTIONS_POPOVER_LABEL,
    isOpen: isPopoverOpen,
    closePopover,
    panelPaddingSize: 'none' as const,
    anchorPosition: 'downRight' as const,
    // The header sits close to the viewport edge, so the default 16px buffer would flip the menu
    // to the side of the button on narrow screens. Keep it below the button instead.
    buffer: 8,
    children: menu,
  };

  if (!mainButton) {
    if (menuButtons.length === 0) {
      return null;
    }
    return (
      <EuiPopover
        {...popoverProps}
        button={
          <EuiToolTip content={MORE_ACTIONS_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              color="text"
              size="s"
              iconType="ellipsis"
              aria-label={MORE_ACTIONS_LABEL}
              onClick={togglePopover}
              data-test-subj="agentBuilderAttachmentMoreActions"
            />
          </EuiToolTip>
        }
      />
    );
  }

  const isIconOnly = iconOnly && Boolean(mainButton.icon);
  const mainTooltipContent = mainButton.disabled
    ? mainButton.disabledReason
    : isIconOnly
    ? mainButton.label
    : undefined;
  const mainProps = {
    ...getNavProps(mainButton),
    iconType: mainButton.icon,
    isDisabled: mainButton.disabled,
    hasAriaDisabled: Boolean(mainButton.disabled && mainButton.disabledReason),
    'data-test-subj': 'agentBuilderAttachmentPrimaryAction',
  };
  const mainColor = mainButton.color ?? 'text';

  if (menuButtons.length === 0) {
    return isIconOnly ? (
      <EuiToolTip content={mainTooltipContent}>
        <EuiButtonIcon
          {...mainProps}
          aria-label={mainButton.label}
          iconType={mainButton.icon ?? ''}
          color={mainColor}
          size="s"
        />
      </EuiToolTip>
    ) : (
      <EuiToolTip content={mainTooltipContent}>
        <EuiButton {...mainProps} color={mainColor} size="s">
          {mainButton.label}
        </EuiButton>
      </EuiToolTip>
    );
  }

  return (
    <EuiSplitButton size="s" color={mainColor} hasAriaDisabled={mainProps.hasAriaDisabled}>
      <EuiSplitButton.ActionPrimary
        {...mainProps}
        isIconOnly={isIconOnly}
        tooltipProps={mainTooltipContent ? { content: mainTooltipContent } : undefined}
        aria-label={mainButton.label}
      >
        {mainButton.label}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        aria-label={MORE_ACTIONS_LABEL}
        iconType="chevronSingleDown"
        onClick={togglePopover}
        popoverProps={popoverProps}
        tooltipProps={{ content: MORE_ACTIONS_LABEL, disableScreenReaderOutput: true }}
        data-test-subj="agentBuilderAttachmentMoreActions"
      />
    </EuiSplitButton>
  );
};
