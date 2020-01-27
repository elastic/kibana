/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { indexBy } from 'lodash';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiPage,
  EuiPageContentBody,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Alert, AlertType, ActionType } from '../../../../types';

interface AlertDetailsProps {
  alert: Alert;
  alertType: AlertType;
  actionTypes: ActionType[];
}

export const AlertDetails: React.FunctionComponent<AlertDetailsProps> = ({
  alert,
  alertType,
  actionTypes,
}) => {
  const actionTypesByTypeId = indexBy(actionTypes, 'id');
  const [firstAction, ...otherActions] = alert.actions;
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="m">
                <h1>{alert.name}</h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup responsive={false} gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty disabled={true} iconType="pencil">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertDetails.editAlertButtonLabel"
                      defaultMessage="Edit"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty disabled={true} iconType="popout">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertDetails.viewAlertInAppButtonLabel"
                      defaultMessage="View in app"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty disabled={true} iconType="menuLeft">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.alertDetails.activityLogButtonLabel"
                      defaultMessage="Activity Log"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiFlexGroup wrap responsive={false} gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiBadge>{alertType.name}</EuiBadge>
              </EuiFlexItem>
              {firstAction && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {actionTypesByTypeId[firstAction.actionTypeId].name ?? firstAction.actionTypeId}
                  </EuiBadge>
                </EuiFlexItem>
              )}
              {otherActions.length ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">+{otherActions.length}</EuiBadge>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
