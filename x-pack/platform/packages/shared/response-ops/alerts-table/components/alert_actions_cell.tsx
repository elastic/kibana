/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexItem, EuiPopover, EuiToolTip } from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DefaultAlertActions } from './default_alert_actions';
import type { AdditionalContext, GetAlertsTableProp } from '../types';
import { STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX } from '../constants';
import { ExpandableContextMenuPanel } from './expandable_context_menu_panel';

const actionsToolTip = i18n.translate('xpack.triggersActionsUI.alertsTable.moreActionsTextLabel', {
  defaultMessage: 'More actions',
});

/**
 * Cell containing contextual actions for a single alert row in the table
 */
export const AlertActionsCell: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const closeActionsPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const toggleActionsPopover = () => {
    setIsPopoverOpen((open) => !open);
  };

  const DefaultRowActions = useMemo(
    () => (
      <DefaultAlertActions<AdditionalContext>
        key="defaultRowActions"
        onActionExecuted={closeActionsPopover}
        resolveRulePagePath={(alertRuleId) =>
          alertRuleId ? `${STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX}${alertRuleId}` : null
        }
        {...props}
      />
    ),
    [props, closeActionsPopover]
  );

  // TODO re-enable view in app when it works
  const actionsMenuItems = [DefaultRowActions];

  return (
    <>
      <EuiFlexItem>
        <EuiPopover
          aria-label={actionsToolTip}
          anchorPosition="rightCenter"
          button={
            <EuiToolTip content={actionsToolTip} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={actionsToolTip}
                color="text"
                data-test-subj="alertsTableRowActionMore"
                display="empty"
                iconType="boxesVertical"
                onClick={toggleActionsPopover}
                size="s"
              />
            </EuiToolTip>
          }
          closePopover={closeActionsPopover}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
          panelStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <ExpandableContextMenuPanel items={actionsMenuItems} />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
};
