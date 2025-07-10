/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Authorization } from '../../hooks/use_authorization';
import * as i18n from './translations';

type MissingPrivilegesDescriptionProps = Partial<Authorization>;
export const MissingPrivilegesDescription = React.memo<MissingPrivilegesDescriptionProps>(
  ({ canCreateIntegrations, canCreateConnectors, canExecuteConnectors }) => {
    return (
      <EuiFlexGroup gutterSize="m" direction="column" data-test-subj="missingPrivilegesGroup">
        <EuiFlexItem>{i18n.PRIVILEGES_REQUIRED_TITLE}</EuiFlexItem>
        <EuiFlexItem>
          <EuiCode>
            <ul>
              {canCreateIntegrations && (
                <>
                  <li>{i18n.REQUIRED_PRIVILEGES.FLEET_ALL}</li>
                  <li>{i18n.REQUIRED_PRIVILEGES.INTEGRATIONS_ALL}</li>
                </>
              )}
              {canCreateConnectors ? (
                <li>{i18n.REQUIRED_PRIVILEGES.CONNECTORS_ALL}</li>
              ) : (
                <>{canExecuteConnectors && <li>{i18n.REQUIRED_PRIVILEGES.CONNECTORS_READ}</li>}</>
              )}
            </ul>
          </EuiCode>
        </EuiFlexItem>
        <EuiFlexItem>{i18n.CONTACT_ADMINISTRATOR}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
MissingPrivilegesDescription.displayName = 'MissingPrivilegesDescription';
