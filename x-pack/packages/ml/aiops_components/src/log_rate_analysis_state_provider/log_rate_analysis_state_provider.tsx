/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type FC,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';

import type { GroupTableItem } from './types';

type InitialAnalysisStart = number | WindowParameters | undefined;
type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;

interface LogRateAnalysisState {
  autoRunAnalysis: boolean;
  setAutoRunAnalysis: Dispatch<SetStateAction<boolean>>;
  initialAnalysisStart: InitialAnalysisStart;
  setInitialAnalysisStart: Dispatch<SetStateAction<InitialAnalysisStart>>;
  pinnedSignificantItem: SignificantItemOrNull;
  setPinnedSignificantItem: Dispatch<SetStateAction<SignificantItemOrNull>>;
  pinnedGroup: GroupOrNull;
  setPinnedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  selectedSignificantItem: SignificantItemOrNull;
  setSelectedSignificantItem: Dispatch<SetStateAction<SignificantItemOrNull>>;
  selectedGroup: GroupOrNull;
  setSelectedGroup: Dispatch<SetStateAction<GroupOrNull>>;
  currentSelectedSignificantItem?: SignificantItem;
  currentSelectedGroup?: GroupTableItem;
  clearAllRowState: () => void;
}

const LogRateAnalysisStateContext = createContext<LogRateAnalysisState | undefined>(undefined);

/**
 * Props for LogRateAnalysisStateProvider.
 */
interface LogRateAnalysisStateProviderProps {
  /** The parameters to be used to trigger an analysis. */
  initialAnalysisStart?: InitialAnalysisStart;
}

/**
 * Context provider component that manages and provides global state for Log Rate Analysis.
 * This provider handles several pieces of state important for controlling and displaying
 * log rate analysis data, such as the control of automatic analysis runs, and the management
 * of both pinned and selected significant items and groups.
 *
 * The state includes mechanisms for setting initial analysis parameters, toggling analysis,
 * and managing the current selection and pinned state of significant items and groups.
 *
 * @param props - Props object containing initial settings for the analysis,
 * including children components to be wrapped by the Provider.
 * @returns A context provider wrapping children with access to log rate analysis state.
 */
export const LogRateAnalysisStateProvider: FC<
  PropsWithChildren<LogRateAnalysisStateProviderProps>
> = (props) => {
  const { children, initialAnalysisStart: incomingInitialAnalysisStart } = props;

  const [autoRunAnalysis, setAutoRunAnalysis] = useState(true);
  const [initialAnalysisStart, setInitialAnalysisStart] = useState<
    number | WindowParameters | undefined
  >(incomingInitialAnalysisStart);

  // Row state that will be shared with all components
  const [pinnedSignificantItem, setPinnedSignificantItem] = useState<SignificantItemOrNull>(null);
  const [pinnedGroup, setPinnedGroup] = useState<GroupOrNull>(null);
  const [selectedSignificantItem, setSelectedSignificantItem] =
    useState<SignificantItemOrNull>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupOrNull>(null);

  // If a row is pinned, still overrule with a potentially hovered row.
  const currentSelectedSignificantItem = useMemo(() => {
    if (selectedSignificantItem) {
      return selectedSignificantItem;
    } else if (pinnedSignificantItem) {
      return pinnedSignificantItem;
    }
  }, [pinnedSignificantItem, selectedSignificantItem]);

  // If a group is pinned, still overrule with a potentially hovered group.
  const currentSelectedGroup = useMemo(() => {
    if (selectedGroup) {
      return selectedGroup;
    } else if (pinnedGroup) {
      return pinnedGroup;
    }
  }, [selectedGroup, pinnedGroup]);

  const contextValue: LogRateAnalysisState = useMemo(
    () => ({
      autoRunAnalysis,
      setAutoRunAnalysis,
      initialAnalysisStart,
      setInitialAnalysisStart,
      pinnedSignificantItem,
      setPinnedSignificantItem,
      pinnedGroup,
      setPinnedGroup,
      selectedSignificantItem,
      setSelectedSignificantItem,
      selectedGroup,
      setSelectedGroup,
      currentSelectedSignificantItem,
      currentSelectedGroup,
      clearAllRowState: () => {
        setPinnedSignificantItem(null);
        setPinnedGroup(null);
        setSelectedSignificantItem(null);
        setSelectedGroup(null);
      },
    }),
    [
      autoRunAnalysis,
      setAutoRunAnalysis,
      initialAnalysisStart,
      setInitialAnalysisStart,
      pinnedSignificantItem,
      setPinnedSignificantItem,
      pinnedGroup,
      setPinnedGroup,
      selectedSignificantItem,
      setSelectedSignificantItem,
      selectedGroup,
      setSelectedGroup,
      currentSelectedSignificantItem,
      currentSelectedGroup,
    ]
  );

  return (
    // Provider managing the state
    <LogRateAnalysisStateContext.Provider value={contextValue}>
      {children}
    </LogRateAnalysisStateContext.Provider>
  );
};

/**
 * Custom hook for accessing the state of log rate analysis from the LogRateAnalysisStateContext.
 * This hook must be used within a component that is a descendant of the LogRateAnalysisStateContext provider.
 *
 * @returns The current state of the log rate analysis.
 * @throws Throws an error if the hook is used outside of its Provider context.
 */
export const useLogRateAnalysisStateContext = () => {
  const logRateAnalysisState = useContext(LogRateAnalysisStateContext);

  // If `undefined`, throw an error.
  if (logRateAnalysisState === undefined) {
    throw new Error('useLogRateAnalysisStateContext was used outside of its Provider');
  }

  return logRateAnalysisState;
};
