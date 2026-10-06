/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPopoverProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  EuiWrappingPopover,
} from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { useActionPolicyMenu } from './use_action_policy_menu';

interface Props {
  policy: ActionPolicyResponse;
  onViewDetails?: (policy: ActionPolicyResponse) => void;
  onEdit?: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable?: (id: string) => void;
  onDisable?: (id: string) => void;
  isStateLoading?: boolean;
  onUpdateApiKey: (id: string) => void;
  isDisabled?: boolean;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onCancelSnooze?: (id: string) => void;
  isSnoozeLoading?: boolean;
  renderButton?: (args: { isOpen: boolean; toggle: () => void }) => React.ReactElement;
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  'data-test-subj'?: string;
  anchorId?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export const ActionPolicyActionsMenu = ({
  policy,
  onViewDetails,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  isStateLoading = false,
  onUpdateApiKey,
  isDisabled = false,
  onSnooze,
  onCancelSnooze,
  isSnoozeLoading = false,
  renderButton,
  anchorPosition = 'downRight',
  'data-test-subj': dataTestSubj,
  anchorId,
  isOpen,
  onOpenChange,
}: Props) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);

  const isControlled = isOpen !== undefined;
  const isPopoverOpen = isControlled ? isOpen! : uncontrolledIsOpen;
  const setIsPopoverOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledIsOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  const { panels, modal } = useActionPolicyMenu({
    policy,
    onViewDetails,
    onEdit,
    onClone,
    onDelete,
    onEnable,
    onDisable,
    isStateLoading,
    onUpdateApiKey,
    onSnooze,
    onCancelSnooze,
    isSnoozeLoading,
    closeMenu: closePopover,
  });

  const trigger = renderButton ? (
    renderButton({ isOpen: isPopoverOpen, toggle: togglePopover })
  ) : (
    <EuiToolTip
      content={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
        defaultMessage: 'More actions',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="boxesVertical"
        color="text"
        aria-label={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
          defaultMessage: 'More actions',
        })}
        onClick={togglePopover}
        isDisabled={isDisabled}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );

  const popoverContent = <EuiContextMenu initialPanelId={0} panels={panels} />;
  const anchor = anchorId ? document.getElementById(anchorId) : null;

  const menuAriaLabel = i18n.translate('xpack.alertingV2.actionPoliciesList.action.actionsMenu', {
    defaultMessage: 'Action policy actions',
  });

  return (
    <>
      {anchorId ? (
        anchor && (
          <EuiWrappingPopover
            button={anchor}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition={anchorPosition}
            panelPaddingSize="s"
            aria-label={menuAriaLabel}
          >
            {popoverContent}
          </EuiWrappingPopover>
        )
      ) : (
        <EuiPopover
          aria-label={menuAriaLabel}
          button={trigger}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition={anchorPosition}
          panelPaddingSize="s"
        >
          {popoverContent}
        </EuiPopover>
      )}
      {modal}
    </>
  );
};
