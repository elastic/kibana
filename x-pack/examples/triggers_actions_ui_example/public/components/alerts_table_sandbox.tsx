/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { AlertsTableProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { AlertConsumers } from '@kbn/rule-data-utils';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const AlertsTableSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const { getAlertsStateTable: AlertsTable } = triggersActionsUi;
  const alertStateProps: AlertsTableProps = {
    id: 'observabilityCases',
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
  };

  return <AlertsTable {...alertStateProps} />;
};
