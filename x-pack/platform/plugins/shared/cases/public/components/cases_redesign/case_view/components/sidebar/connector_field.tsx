/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import type { CaseConnectors, CaseUI } from '../../../../../../common/ui/types';
import type { ActionConnector, CaseConnector } from '../../../../../../common/types/domain';
import { ConnectorsForm } from '../../../../edit_connector/connectors_form';
import { useApplicationCapabilities } from '../../../../../common/lib/kibana';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { READ_ACTIONS_PERMISSIONS_ERROR_MSG } from '../../../../../common/translations';

export interface ConnectorFieldProps {
  caseData: CaseUI;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (connector: CaseConnector) => void;
}

export const ConnectorField: FC<ConnectorFieldProps> = ({
  caseData,
  caseConnectors,
  supportedActionConnectors,
  isLoading,
  onSubmit,
}) => {
  const { actions } = useApplicationCapabilities();
  const { permissions } = useCasesContext();
  const canUseConnectors = permissions.connectors && actions.read;

  // the form resets its own values on cancel, nothing else to do here
  const onCancel = useCallback(() => {}, []);

  if (!canUseConnectors) {
    return (
      <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
        <span>{READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
      </EuiText>
    );
  }

  return (
    <EuiFlexItem grow={false} data-test-subj="case-view-edit-connector">
      <ConnectorsForm
        caseData={caseData}
        caseConnectors={caseConnectors}
        supportedActionConnectors={supportedActionConnectors}
        isLoading={isLoading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </EuiFlexItem>
  );
};

ConnectorField.displayName = 'ConnectorField';
