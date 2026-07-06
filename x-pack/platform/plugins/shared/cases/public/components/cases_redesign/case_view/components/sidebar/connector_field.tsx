/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { CaseConnectors, CaseUI } from '../../../../../../common/ui/types';
import type { ActionConnector, CaseConnector } from '../../../../../../common/types/domain';
import { EditConnector } from '../../../../edit_connector';

export interface ConnectorFieldProps {
  caseData: CaseUI;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (connector: CaseConnector) => void;
}

// Delegates to EditConnector (with its own "Connectors" header suppressed, since the
// accordion section already renders one) so the redesigned sidebar keeps the full
// push-to-service experience: preview mode, edit toggle, push button, and callouts.
export const ConnectorField: FC<ConnectorFieldProps> = ({
  caseData,
  caseConnectors,
  supportedActionConnectors,
  isLoading,
  onSubmit,
}) => (
  <EditConnector
    caseData={caseData}
    caseConnectors={caseConnectors}
    supportedActionConnectors={supportedActionConnectors}
    isLoading={isLoading}
    onSubmit={onSubmit}
    showHeader={false}
    actionsVariant="outlined"
  />
);

ConnectorField.displayName = 'ConnectorField';
