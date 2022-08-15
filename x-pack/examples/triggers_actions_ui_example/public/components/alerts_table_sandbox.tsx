/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import { AlertConsumers } from '@kbn/rule-data-utils';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const AlertsTableSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const { getAlertsStateTable: AlertsTable, alertsTableConfigurationRegistry } = triggersActionsUi;
  const alertStateProps: AlertsTableStateProps = {
    id: 'observabilityCases',
    configurationId: 'observabilityCases',
    alertsTableConfigurationRegistry,
    featureIds: [
      AlertConsumers.INFRASTRUCTURE,
      AlertConsumers.APM,
      AlertConsumers.OBSERVABILITY,
      AlertConsumers.LOGS,
    ],
    query: {
      bool: {
        filter: [],
      },
    },
    showExpandToDetails: true,
  };

  return <AlertsTable {...alertStateProps} />;
};
