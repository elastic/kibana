/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import type { FormValues } from '../../../form/types';
import { validateCommittedQuery } from '../validation/committed_query_validation';

interface QueryFieldRulesProps {
  queryCommitted: boolean;
}

/**
 * Always-mounted registration for the `query` field so `trigger(['query'])`
 * works even when AlertConditionStep is not the visible step (or is suspended).
 * Keeps `queryCommitted` in a ref so validate never reads a stale closure.
 */
export const QueryFieldRules = ({ queryCommitted }: QueryFieldRulesProps): null => {
  const { control, getValues } = useFormContext<FormValues>();
  const queryCommittedRef = useRef(queryCommitted);
  queryCommittedRef.current = queryCommitted;

  useController({
    name: 'query',
    control,
    rules: {
      validate: (value) =>
        validateCommittedQuery(value, getValues('kind'), queryCommittedRef.current),
    },
  });

  return null;
};
