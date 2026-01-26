/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { ResponseOpsQueryClientProvider } from '@kbn/response-ops-react-query/providers/response_ops_query_client_provider';
import { ConnectorProvider } from '../application/context/connector_context';
import { RulesList } from '../application/sections';
import type { RulesListProps } from '../application/sections/rules_list/components/rules_list';
import type { ConnectorServices } from '../types';

export const getRulesListLazy = (props: {
  connectorServices: ConnectorServices;
  rulesListProps: RulesListProps;
}) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <ResponseOpsQueryClientProvider>
        <PerformanceContextProvider>
          <RulesList {...props.rulesListProps} />
        </PerformanceContextProvider>
      </ResponseOpsQueryClientProvider>
    </ConnectorProvider>
  );
};
