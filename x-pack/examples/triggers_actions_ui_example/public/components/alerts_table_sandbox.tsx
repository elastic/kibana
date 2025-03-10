/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';

export const AlertsTableSandbox = ({ services }: Pick<AlertsTableProps, 'services'>) => {
  return (
    <AlertsTable
      id={'observabilityCases'}
      ruleTypeIds={['.es-query']}
      query={{
        bool: {
          filter: [],
        },
      }}
      services={services}
    />
  );
};
