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
              onClick={button.handler}
              isDisabled={button.disabled}
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
              onClick={button.handler}
              isDisabled={button.disabled}
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
