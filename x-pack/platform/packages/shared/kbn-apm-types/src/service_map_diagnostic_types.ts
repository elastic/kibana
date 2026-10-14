/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';

export interface ExitSpanFields {
  destinationService: string;
  spanId: string;
  transactionId: string;
  serviceNodeName: string;
  traceId: string;
  agentName: string;
}

export interface ServiceMapDiagnosticResponse {
  analysis: {
    exitSpans: {
      found: boolean;
      totalConnections: number;
      apmExitSpans: ExitSpanFields[] | [];
      hasMatchingDestinationResources: boolean;
    };
    parentRelationships: {
      found: boolean;
      documentCount: number;
      sourceSpanIds: string[];
    };
    traceCorrelation?: {
      found: boolean;
      foundInSourceNode: boolean;
      foundInDestinationNode: boolean;
      sourceNodeDocumentCount: number;
      destinationNodeDocumentCount: number;
    };
  };
  elasticsearchResponses: {
    exitSpansQuery?: ESSearchResponse<unknown, ESSearchRequest>;
    sourceSpansQuery?: ESSearchResponse<unknown, ESSearchRequest>;
    destinationParentIdsQuery?: ESSearchResponse<unknown, ESSearchRequest>;
    traceCorrelationQuery?: ESSearchResponse<unknown, ESSearchRequest>;
  };
}

export interface DiagnosticNodeSelection {
  field: string;
  value: string;
}

export interface ServiceMapDiagnosticRequest {
  start: number;
  end: number;
  sourceNode: DiagnosticNodeSelection;
  destinationNode: DiagnosticNodeSelection;
  traceId: string;
}
