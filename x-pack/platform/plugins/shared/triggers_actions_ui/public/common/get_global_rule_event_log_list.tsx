/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalRuleEventLogList } from '../application/sections';
import type { GlobalRuleEventLogListProps } from '../application/sections/rule_details/components/global_rule_event_log_list';

const queryClient = new QueryClient();

export const getGlobalRuleEventLogListLazy = (props: GlobalRuleEventLogListProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalRuleEventLogList {...props} />
    </QueryClientProvider>
  );
};
