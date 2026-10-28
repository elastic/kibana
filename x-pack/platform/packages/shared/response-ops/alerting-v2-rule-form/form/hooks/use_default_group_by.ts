/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getGroupByColumnsFromQuery } from '@kbn/alerting-v2-utils';

interface UseDefaultGroupByProps {
  query: string;
}

export const useDefaultGroupBy = ({ query }: UseDefaultGroupByProps) => {
  const defaultGroupBy = useMemo(() => {
    return getGroupByColumnsFromQuery(query);
  }, [query]);

  return { defaultGroupBy };
};
