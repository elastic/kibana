/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Investigation } from '../../types/investigation';

/**
 * When investigations open cases instead of escalations, the host supplies this: the queue card,
 * the card menu, and the flyout then offer Open a case, Add to existing case, and View case, and
 * show the investigation's case. Without it they keep the escalation actions.
 */
export interface CaseBridgeContextValue {
  /** The investigation's case badge ("Case #12", or "Case unavailable"). */
  renderCaseBadge: (props: { caseId: string }) => ReactNode;
  /** Opens the investigation's case. */
  onViewCase: (caseId: string) => void;
  /** Label for the View case menu item, with the case number once it is known. */
  getViewCaseLabel?: (caseId: string) => string | undefined;
  /**
   * The case of an investigation the host only knows by conversation id (queue cards are built
   * from proposals, which don't carry the case).
   */
  resolveCaseId?: (conversationId: string) => string | undefined;
  /**
   * What a queue group header shows about a case. `undefined` while the case is loading, `null`
   * when it was deleted or the viewer can't see it.
   */
  getCaseSummary?: (caseId: string) => CaseBridgeCaseSummary | null | undefined;
}

export interface CaseBridgeCaseSummary {
  title: string;
  /** The case number, once Cases has assigned it. */
  incrementalId?: number;
  /** The case's status category: open, in-progress, or closed. */
  status: string;
  isRestricted: boolean;
}

const CaseBridgeContext = createContext<CaseBridgeContextValue | undefined>(undefined);

export const CaseBridgeProvider: React.FC<{
  value: CaseBridgeContextValue;
  children: ReactNode;
}> = ({ value, children }) => (
  <CaseBridgeContext.Provider value={value}>{children}</CaseBridgeContext.Provider>
);

export const useCaseBridge = (): CaseBridgeContextValue | undefined =>
  useContext(CaseBridgeContext);

export const getInvestigationCaseId = (investigation: Pick<Investigation, 'caseId'>) =>
  investigation.caseId && investigation.caseId.length > 0 ? investigation.caseId : undefined;

/** The investigation's case: its own `caseId`, or the one the host resolves from its conversation. */
export const useInvestigationCaseId = (
  investigation: Pick<Investigation, 'caseId' | 'conversationId'>
): string | undefined => {
  const caseBridge = useCaseBridge();
  return (
    getInvestigationCaseId(investigation) ??
    (investigation.conversationId
      ? caseBridge?.resolveCaseId?.(investigation.conversationId)
      : undefined)
  );
};
