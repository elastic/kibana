/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

type MockActiveTab = 'workflow' | 'executions';

export const useWorkflowUrlState = () => {
  const [activeTab, setActiveTabState] = useState<MockActiveTab>('workflow');
  const setActiveTab = useCallback((tab: MockActiveTab) => {
    setActiveTabState(tab);
  }, []);
  return {
    activeTab,
    editorView: 'graph' as const,
    graphDirection: 'TB' as const,
    selectedExecutionId: undefined,
    isViewingExecution: false,
    lastViewedExecutionId: undefined,
    executionListFilters: {
      statuses: [],
      executionTypes: [],
      executedBy: [],
    },
    selectedStepExecutionId: undefined,
    selectedStepId: undefined,
    shouldAutoResume: false,
    setActiveTab,
    setEditorView: () => {},
    setGraphDirection: () => {},
    setSelectedExecution: () => {},
    selectEditorRun: () => {},
    setSelectedStepExecution: () => {},
    setSelectedStep: () => {},
    updateUrlState: () => {},
    clearResumeParam: () => {},
  };
};
