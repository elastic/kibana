/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { RuleSummaryData } from '../types';

export const RuleSummaryContext = createContext<RuleSummaryData | undefined>(undefined);

export const useRuleSummary = (): RuleSummaryData => {
  const rule = useContext(RuleSummaryContext);

  if (!rule) {
    throw new Error('useRuleSummary must be used within RuleSummaryBody');
  }

  return rule;
};
