/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { AttachmentType, APP_ID as CASE_APP_ID } from '@kbn/cases-plugin/common';
import { ALERT_RULE_NAME, ALERT_RULE_UUID, ALERT_UUID } from '@kbn/rule-data-utils';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import { PLUGIN_ID } from '../../../common/constants/app';
import { useMlKibana } from '../../application/contexts/kibana';

export const AlertActions: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const { alert, refresh } = props;
  const { cases } = useMlKibana().services;
  const casesPrivileges = cases?.helpers.canUseCases([CASE_APP_ID]);

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const ruleId = (alert[ALERT_RULE_UUID]?.[0] as string) ?? null;
  const alertId = (alert[ALERT_UUID]?.[0] as string) ?? '';

  const ecsData = useMemo<Ecs>(
    () => ({
      _id: alert._id,
      _index: alert._index,
    }),
    [alert._id, alert._index]
  );

  const caseAttachments: CaseAttachmentsWithoutOwner = useMemo(() => {
    return ecsData?._id
      ? [
          {
            alertId: alertId ?? '',
            index: ecsData?._index ?? '',
            type: AttachmentType.alert,
            rule: {
              id: ruleId,
              name: alert[ALERT_RULE_NAME]![0] as string,
            },
            owner: PLUGIN_ID,
          },
        ]
      : [];
  }, [alert, alertId, ecsData?._id, ecsData?._index, ruleId]);

  const onSuccess = useCallback(() => {
    refresh();
  }, [refresh]);

  const createCaseFlyout = cases?.hooks?.useCasesAddToNewCaseFlyout({ onSuccess });
  const selectCaseModal = cases?.hooks?.useCasesAddToExistingCaseModal({ onSuccess });

  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const toggleActionsPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleAddToNewCaseClick = () => {
    createCaseFlyout?.open({ attachments: caseAttachments });
    closeActionsPopover();
  };

  const handleAddToExistingCaseClick = () => {
    selectCaseModal?.open({ getAttachments: () => caseAttachments });
    closeActionsPopover();
  };

  const defaultAlertActions = useMemo(
    () => (
      <DefaultAlertActions
        key="defaultRowActions"
        onActionExecuted={closeActionsPopover}
        isAlertDetailsEnabled={false}
        resolveRulePagePath={(alertRuleId) =>
          alertRuleId
            ? `/app/management/insightsAndAlerting/triggersActions/rule/${alertRuleId}`
            : null
        }
        {...props}
      />
    ),
    [props]
  );

  const actionsMenuItems = [
    ...(casesPrivileges && casesPrivileges?.create && casesPrivileges.read
      ? [
          <EuiContextMenuItem
            data-test-subj="add-to-existing-case-action"
            key="addToExistingCase"
            onClick={handleAddToExistingCaseClick}
            size="s"
          >
            {i18n.translate('xpack.ml.alerts.actions.addToCase', {
              defaultMessage: 'Add to existing case',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="add-to-new-case-action"
            key="addToNewCase"
            onClick={handleAddToNewCaseClick}
            size="s"
          >
            {i18n.translate('xpack.ml.alerts.actions.addToNewCase', {
              defaultMessage: 'Add to new case',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
  ];

  if (defaultAlertActions) {
    actionsMenuItems.push(defaultAlertActions);
  }

  const actionsToolTip =
    actionsMenuItems.length <= 0
      ? i18n.translate('xpack.ml.alertsTable.notEnoughPermissions', {
          defaultMessage: 'Additional privileges required',
        })
      : i18n.translate('xpack.ml.alertsTable.moreActionsTextLabel', {
          defaultMessage: 'More actions',
        });

  return (
    <>
      <EuiPopover
        anchorPosition="downLeft"
        button={
          <EuiToolTip content={actionsToolTip}>
            <EuiButtonIcon
              aria-label={actionsToolTip}
              color="text"
              data-test-subj="alertsTableRowActionMore"
              display="empty"
              iconType="boxesHorizontal"
              onClick={toggleActionsPopover}
              size="s"
            />
          </EuiToolTip>
        }
        closePopover={closeActionsPopover}
        isOpen={isPopoverOpen}
        panelPaddingSize="none"
      >
        <EuiContextMenuPanel
          size="s"
          items={actionsMenuItems}
          data-test-subj="alertsTableActionsMenu"
        />
      </EuiPopover>
    </>
  );
};
