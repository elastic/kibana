/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { AlertsTableProps } from '@kbn/triggers-actions-ui-plugin/public/types';

interface SandboxProps {
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

export const AlertsTableSandbox = ({ triggersActionsUi }: SandboxProps) => {
  const { getAlertsStateTable: AlertsTable } = triggersActionsUi;
  const alertStateProps: AlertsTableProps = {
    id: 'observabilityCases',
    ruleTypeIds: ['.es-query'],
    query: {
      bool: {
        filter: [],
      },
    },
  };

  return <AlertsTable {...alertStateProps} />;
};
