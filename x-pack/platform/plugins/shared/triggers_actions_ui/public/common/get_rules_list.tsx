/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectorProvider } from '../application/context/connector_context';
import { RulesList } from '../application/sections';
import type { RulesListProps } from '../application/sections/rules_list/components/rules_list';
import { ConnectorServices } from '../types';

const queryClient = new QueryClient();

export const getRulesListLazy = (props: {
  connectorServices: ConnectorServices;
  rulesListProps: RulesListProps;
}) => {
  return (
    <ConnectorProvider value={{ services: props.connectorServices }}>
      <QueryClientProvider client={queryClient}>
        <RulesList {...props.rulesListProps} />
      </QueryClientProvider>
    </ConnectorProvider>
  );
};
