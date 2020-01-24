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
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
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
  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="m">
              <h1>{alert.name}</h1>
            </EuiTitle>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
            <EuiPanel paddingSize="none">
              <EuiFlexGroup wrap responsive={false} gutterSize="xs">
                <EuiFlexItem>
                  <EuiBadge>{alertType.name}</EuiBadge>
                </EuiFlexItem>
                {alert.actions.map(action => (
                  <EuiFlexItem key={action.id}>
                    <EuiBadge color="hollow">
                      {actionTypesByTypeId[action.actionTypeId].name ?? action.actionTypeId}
                    </EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
      </EuiPageContent>
    </EuiPageBody>
  );
};
