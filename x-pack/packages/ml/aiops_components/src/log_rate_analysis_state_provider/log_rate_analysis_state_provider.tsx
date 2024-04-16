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

export const logRateAnalysisStateContext = createContext<LogRateAnalysisState | undefined>(
  undefined
);

interface LogRateAnalysisStateProviderProps {
  initialAnalysisStart?: InitialAnalysisStart;
}

export const LogRateAnalysisStateProvider: FC<LogRateAnalysisStateProviderProps> = ({
  children,
  initialAnalysisStart: incomingInitialAnalysisStart,
}) => {
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
    <logRateAnalysisStateContext.Provider value={contextValue}>
      {children}
    </logRateAnalysisStateContext.Provider>
  );
};

export const useLogRateAnalysisStateContext = () => {
  const logRateAnalysisState = useContext(logRateAnalysisStateContext);

  // If `undefined`, throw an error.
  if (logRateAnalysisState === undefined) {
    throw new Error('useLogRateAnalysisStateContext was used outside of its Provider');
  }

  return logRateAnalysisState;
};
