/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunBudgetGroupId } from '../run_quotas';

export type CostCoverageState = 'complete' | 'partial' | 'unavailable';

export interface CostTokenCounts {
  prompt: number;
  cached: number;
  completion: number;
  thinking: number;
}

export interface CostFigureResponse {
  estimatedCost: number | null;
  coverage: CostCoverageState;
  tokens: CostTokenCounts;
  pricedTokenCount: number;
  unpricedTokenCount: number;
  nonEisTokenCount: number;
  unpricedConnectorIds: string[];
  nonEisConnectorIds: string[];
  byoConnectorIds: string[];
  selfHostedConnectorIds: string[];
  missingModelIds: string[];
  truncated: boolean;
}

export interface TokenIndexCostResponse {
  source: 'token_index';
  period: {
    kind: 'today' | 'month';
    start: string;
    end: string;
    label: 'today' | 'month_to_date' | 'unverified_period';
    fullCoverage: boolean;
    coveredSince?: string;
  };
  total: CostFigureResponse;
  groups: Record<RunBudgetGroupId, CostFigureResponse>;
  unknownFeatureDocumentCount: number;
  tierCrossings: Array<{
    modelId: string;
    threshold: number;
    documentCount: number;
  }>;
  priceStale: boolean;
  serviceMapStale: boolean;
  priceFetchedAt: string;
  currency: {
    code: 'USD' | null;
    symbol: '$' | null;
    assumed: boolean;
    unit: '1M Token';
  };
  knownGaps: [
    'mid_stream_failures_unrecorded',
    'non_chat_inference_excluded',
    'token_index_write_failures_unrecorded',
    'cache_write_tokens_unavailable'
  ];
}

export interface WorkflowStepAttributionResponse {
  stepId: string;
  connectorId: string;
  tokens: CostTokenCounts;
  estimatedCost: number | null;
  coverage: CostCoverageState;
}

export interface WorkflowAttributionResponse {
  workflowId: string;
  tokens: CostTokenCounts;
  estimatedCost: number | null;
  coverage: CostCoverageState;
  steps: WorkflowStepAttributionResponse[];
}

export interface GroupWorkflowAttributionResponse {
  group: RunBudgetGroupId;
  status: 'attributed' | 'not_attributable';
  tokens: CostTokenCounts;
  estimatedCost: number | null;
  coverage: CostCoverageState;
  workflows: WorkflowAttributionResponse[];
  unpricedConnectorIds: string[];
  reconciliationRatio: number | null;
  inconsistent: boolean;
  otherPathsTokens: number;
  otherPathsEstimatedCost: number | null;
}

export interface WorkflowAttributionResultResponse {
  source: 'workflow_step_usage';
  groups: Record<RunBudgetGroupId, GroupWorkflowAttributionResponse>;
  trackingGaps: Array<{
    start: string;
    end: string;
    source: 'inferred' | 'audit';
  }>;
}

export interface CostSpaceTrackingCoverageResponse {
  spaces: Array<{
    id: string;
    name: string;
    tracking: 'enabled' | 'disabled' | 'unknown';
  }>;
  currentSpaceTracking: 'enabled' | 'disabled' | 'unknown';
  coveredSpaceCount: number;
  totalSpaceCount: number;
  unavailableSpaceCount: number;
  allSpacesTracked: boolean;
  fullTrackingSince?: string;
  untrackedSpaces: Array<{ id: string; name: string }>;
  newSpaces: Array<{ id: string; name: string }>;
}

export interface CostPeriodResponse {
  tokenIndex: TokenIndexCostResponse;
  workflowAttribution: WorkflowAttributionResultResponse;
}

export interface SignificantEventsCostResponse {
  asOf: string;
  spaceCoverage: CostSpaceTrackingCoverageResponse;
  today: CostPeriodResponse;
  month: CostPeriodResponse;
  interactiveAgentChatsExcluded: true;
}

export interface SetTokenUsageTrackingResponse {
  enabled: boolean;
  updatedSpaceIds: string[];
  failedSpaces: Array<{
    id: string;
    name: string;
    error: string;
  }>;
}
