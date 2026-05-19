import React from 'react';
import type { CasesContextState } from './cases_context_reducer';
export declare const CasesStateContext: React.Context<CasesContextState | undefined>;
export declare const useCasesStateContext: () => CasesContextState;
