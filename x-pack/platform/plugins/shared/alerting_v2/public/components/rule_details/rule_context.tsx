/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { RuleApiResponse } from '../../services/rules_api';

const RuleContext = createContext<RuleApiResponse | undefined>(undefined);

export const RuleProvider = ({
  rule,
  children,
}: {
  rule: RuleApiResponse;
  children: React.ReactNode;
}) => {
  return <RuleContext.Provider value={rule}>{children}</RuleContext.Provider>;
};

export const useRule = (): RuleApiResponse => {
  const rule = useContext(RuleContext);
  if (!rule) {
    throw new Error('useRule must be used within a RuleProvider');
  }
  return rule;
};
