/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAlertingLocators } from '../../application/locator_context';
import type { UseRuleMenuPanelsParams } from './use_rule_menu_panels';
import {
  getRuleDetailsLink,
  RULE_MENU_ARIA_LABEL,
  useRuleMenuPanels,
} from './use_rule_menu_panels';

export type RuleActionsMenuProps = Omit<UseRuleMenuPanelsParams, 'closeMenu' | 'detailsLink'> & {
  /** When true, adds a leading "View details" read action linking to the rule details page. */
  showViewDetails?: boolean;
};

export const RuleActionsMenu = ({ showViewDetails = false, ...props }: RuleActionsMenuProps) => {
  const { rulesLocators } = useAlertingLocators();
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  // The details URL is resolved only while the menu is open, so closed rows do no locator work.
  const detailsLink =
    showViewDetails && isOpen ? getRuleDetailsLink(rulesLocators, props.rule.id) : undefined;
  const panels = useRuleMenuPanels({ ...props, detailsLink, closeMenu: closePopover });

  if (panels.length === 0 && !showViewDetails) {
    return null;
  }

  return (
    <EuiPopover
      button={
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
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`ruleActionsButton-${props.rule.id}`}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={RULE_MENU_ARIA_LABEL}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
