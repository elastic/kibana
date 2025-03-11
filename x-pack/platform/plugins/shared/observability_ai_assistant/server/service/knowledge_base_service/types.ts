/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ConnectorConnectorStatus } from '@elastic/elasticsearch/lib/api/types';
import { InferenceModelResolvedStatus, InferenceModelStatus } from '../inference_endpoint';

export interface KnowledgeBaseConnector {
  description: string;
  id: string;
  index_name?: string | null;
  name: string;
  service_type: string;
  status: ConnectorConnectorStatus;
}

interface KnowledgeBaseSourceInternal {
  internal: {};
}

interface KnowledgeBaseSourceProductDocumentation {
  product_documentation: {};
}

interface KnowledgeBaseSourceConnector {
  connector: KnowledgeBaseConnector;
}

interface KnowledgeBaseSourceIndex {
  index: {
    name: string;
  };
}

export type KnowledgeBaseSource =
  | KnowledgeBaseSourceInternal
  | KnowledgeBaseSourceProductDocumentation
  | KnowledgeBaseSourceConnector
  | KnowledgeBaseSourceIndex;

export type KnowledgeBaseSourceType = 'internal' | 'product_documentation' | 'connector' | 'index';

export interface KnowledgeBaseHit {
  id: string;
  title: string;
  score: number;
  document: unknown;
  text: string;
  truncated?: {
    truncatedText: string;
    originalTokenCount: number;
    truncatedTokenCount: number;
  };
  source: KnowledgeBaseSource;
}

export interface GetConnectorsResponse {
  connectors?: KnowledgeBaseConnector[];
  indexPattern: string[];
}

interface KnowledgeBaseStatusDisabled {
  enabled: false;
}

interface InternalKnowledgeBaseStatusAvailable {
  available: true;
  model: InferenceModelResolvedStatus;
}

interface InternalKnowledgeBasseStatusUnavailable {
  available: boolean;
  model?: InferenceModelStatus;
}

export type InternalKnowledgeBaseStatus =
  | InternalKnowledgeBaseStatusAvailable
  | InternalKnowledgeBasseStatusUnavailable;

interface KnowledgeBaseStatusEnabled {
  enabled: true;
  product_documentation: {
    available: boolean;
  };
  internal: InferenceModelStatus;
  has_any_docs: boolean;
}

export type KnowledgeBaseStatus = KnowledgeBaseStatusDisabled | KnowledgeBaseStatusEnabled;

export interface KnowledgeBaseKeywordQueryContainer {
  keyword: {
    value: string[];
    boost?: number;
  };
}

export interface KnowledgeBaseSemanticTextContainer {
  semantic: {
    query: string;
    boost?: number;
  };
}

export type KnowledgeBaseQueryContainer =
  | KnowledgeBaseKeywordQueryContainer
  | KnowledgeBaseSemanticTextContainer;
