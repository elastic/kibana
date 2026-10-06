/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPopoverProps } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  EuiWrappingPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';
import { useRuleMenuPanels } from './use_rule_menu_panels';

export interface RuleActionsMenuProps {
  rule: RuleApiResponse;
  /** Gates write actions (run, edit, clone, enable/disable, delete); read actions always show. */
  canWrite: boolean;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled?: (rule: RuleApiResponse) => void;
  onUpdateApiKey?: (rule: RuleApiResponse) => void;
  onRun?: (rule: RuleApiResponse) => void;
  /** When provided, adds a menu entry that opens change history for the rule. */
  onViewChangeHistory?: (rule: RuleApiResponse) => void;
  /** When provided, adds a leading "View details" read action linking to the rule details page. */
  detailsHref?: string;
  renderButton?: (args: { isOpen: boolean; toggle: () => void }) => React.ReactElement;
  anchorId?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  anchorPosition?: EuiPopoverProps['anchorPosition'];
}

export const RuleActionsMenu = ({
  rule,
  canWrite,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  onUpdateApiKey,
  onRun,
  onViewChangeHistory,
  detailsHref,
  renderButton,
  anchorId,
  isOpen: isOpenProp,
  onOpenChange,
  anchorPosition = 'downRight',
}: RuleActionsMenuProps) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const isControlled = isOpenProp !== undefined;
  const isOpen = isControlled ? isOpenProp : uncontrolledIsOpen;
  const setIsOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledIsOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );
  const closePopover = useCallback(() => setIsOpen(false), [setIsOpen]);

  const panels = useRuleMenuPanels({
    rule,
    canWrite,
    onEdit,
    onClone,
    onDelete,
    onToggleEnabled,
    onUpdateApiKey,
    onRun,
    onViewChangeHistory,
    detailsHref,
    closeMenu: closePopover,
  });

  if (panels.length === 0) {
    return null;
  }

  const toggle = () => setIsOpen(!isOpen);
  const menuAriaLabel = i18n.translate('xpack.alertingV2.rulesList.action.actionsMenu', {
    defaultMessage: 'Rule actions',
  });

  if (anchorId) {
    const anchor = document.getElementById(anchorId);
    if (!anchor) {
      return null;
    }

    return (
      <EuiWrappingPopover
        button={anchor}
        isOpen={isOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition={anchorPosition}
        aria-label={menuAriaLabel}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiWrappingPopover>
    );
  }

  const button = renderButton ? (
    renderButton({ isOpen, toggle })
  ) : (
    <EuiToolTip
      content={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
        defaultMessage: 'More actions',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="ellipsis"
        aria-label={i18n.translate('xpack.alertingV2.rulesList.action.moreActions', {
          defaultMessage: 'More actions',
        })}
        color="text"
        onClick={toggle}
        data-test-subj={`ruleActionsButton-${rule.id}`}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
      aria-label={menuAriaLabel}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
