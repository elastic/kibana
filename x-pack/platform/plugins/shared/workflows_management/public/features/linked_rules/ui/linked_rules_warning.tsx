/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useQuery } from '@kbn/react-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { LinkedRulesCallout } from './linked_rules_callout';
import { linkedRulesQueryOptions } from '../model/linked_rules_query_options';

export const LinkedRulesWarning = ({ workflowIds }: { workflowIds: string[] }) => {
  const api = useWorkflowsApi();
  const { data, isError } = useQuery(linkedRulesQueryOptions(api, workflowIds));
  return <LinkedRulesCallout workflowCount={workflowIds.length} data={data} isError={isError} />;
};
