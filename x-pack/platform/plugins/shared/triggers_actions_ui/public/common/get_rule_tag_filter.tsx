/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ResponseOpsQueryClientProvider } from '@kbn/response-ops-react-query/providers/response_ops_query_client_provider';
import { RuleTagFilter } from '../application/sections';
import type { RuleTagFilterProps } from '../application/sections/rules_list/components/rule_tag_filter';

export const getRuleTagFilterLazy = (props: RuleTagFilterProps) => {
  return (
    <ResponseOpsQueryClientProvider>
      <RuleTagFilter {...props} />
    </ResponseOpsQueryClientProvider>
  );
};
