/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';

export type CachedRule = FindRulesResponse['items'][number];

export interface AlertHostContextValue {
  getRuleDetailsHref?: (ruleId: string, isSourceRule?: boolean) => string | undefined;
  getEpisodeDetailsHref?: (episodeId: string) => string;
  openRuleFlyout?: (
    ruleId: string,
    sourceRuleInfo?: { category?: string },
    cachedRule?: CachedRule
  ) => void;
  closeRuleFlyout?: () => void;
  canWriteAlerts?: boolean;
}

const AlertHostContext = createContext<AlertHostContextValue>({});

export const AlertHostProvider = ({
  value,
  children,
}: PropsWithChildren<{ value: AlertHostContextValue }>) => (
  <AlertHostContext.Provider value={value}>{children}</AlertHostContext.Provider>
);

export const useAlertHost = (): AlertHostContextValue => useContext(AlertHostContext);
