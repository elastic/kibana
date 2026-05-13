/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type ActionButton, ActionButtonType } from '@kbn/agent-builder-browser/attachments';

interface AttachmentActionsProps {
  buttons: ActionButton[];
}

export const AttachmentActions: React.FC<AttachmentActionsProps> = ({ buttons }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const secondaryButtons = buttons.filter((b) => b.type === ActionButtonType.SECONDARY);
  const primaryButtons = buttons.filter((b) => b.type === ActionButtonType.PRIMARY);
  const overflowButtons = buttons.filter((b) => b.type === ActionButtonType.OVERFLOW);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const maybeWrapWithTooltip = useCallback((button: ActionButton, element: React.ReactElement) => {
    if (!button.disabled || !button.disabledReason) {
      return element;
    }

    return (
      <EuiToolTip content={button.disabledReason}>
        <span tabIndex={0}>{element}</span>
      </EuiToolTip>
    );
  }, []);

  // Derive the navigation/click props for an EUI button. When `href` is set we
  // render an anchor (so middle-click / cmd-click / "Open in new tab" all work
  // natively); `rel="noopener noreferrer"` is added automatically for `_blank`
  // targets.
  const getNavProps = (button: ActionButton) => ({
    href: button.href,
    target: button.href ? button.target : undefined,
    rel: button.href && button.target === '_blank' ? 'noopener noreferrer' : undefined,
    onClick: button.handler,
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      {secondaryButtons.map((button) => (
        <EuiFlexItem grow={false} key={button.label}>
          {maybeWrapWithTooltip(
            button,
            <EuiButtonEmpty
              color="text"
              size="s"
              iconType={button.icon}
              isDisabled={button.disabled}
              {...getNavProps(button)}
            >
              {button.label}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
      ))}
      {primaryButtons.map((button) => (
        <EuiFlexItem grow={false} key={button.label}>
          {maybeWrapWithTooltip(
            button,
            <EuiButton
              color="text"
              size="s"
              iconType={button.icon}
              isDisabled={button.disabled}
              {...getNavProps(button)}
            >
              {button.label}
            </EuiButton>
          )}
        </EuiFlexItem>
      ))}
      {overflowButtons.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.translate('xpack.agentBuilder.attachmentActions.moreActionsPopover', {
              defaultMessage: 'Attachment actions',
            })}
            button={
              <EuiButtonIcon
                color="text"
                iconType="boxesVertical"
                aria-label={i18n.translate('xpack.agentBuilder.attachmentActions.moreActions', {
                  defaultMessage: 'More actions',
                })}
                onClick={togglePopover}
                size="s"
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downRight"
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={[
                {
                  id: 0,
                  items: overflowButtons.map((button) => ({
                    name: button.label,
                    icon: button.icon,
                    disabled: button.disabled,
                    toolTipContent: button.disabled ? button.disabledReason : undefined,
                    href: button.href,
                    target: button.href ? button.target : undefined,
                    rel:
                      button.href && button.target === '_blank' ? 'noopener noreferrer' : undefined,
                    onClick: () => {
                      closePopover();
                      button.handler();
                    },
                  })),
                },
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
