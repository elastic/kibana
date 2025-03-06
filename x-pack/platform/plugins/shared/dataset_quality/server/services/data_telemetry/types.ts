/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndexName,
  IndicesGetMappingResponse,
  IndicesStatsResponse,
  Metadata,
} from '@elastic/elasticsearch/lib/api/types';

export interface DatasetIndexPattern {
  pattern: string;
  patternName: string;
  shipper?: string;
}

export interface IndexBasicInfo {
  patternName: string;
  shipper?: string;
  isDataStream: boolean;
  name: string;
  indices: IndexName[];
  meta?: Metadata;
  mapping?: IndicesGetMappingResponse;
  namespace?: string;
}

export interface DataStreamStatsPerNamespace {
  patternName: string;
  shipper?: string;
  namespace?: string;
  totalDocuments: number;
  totalSize: number;
  totalIndices: number;
  failureStoreDocuments: number;
  failureStoreIndices: number;
  meta?: Metadata;
  mapping?: IndicesGetMappingResponse;
  indexStats: IndicesStatsResponse['indices'];
  failureStoreStats: IndicesStatsResponse['indices'];
}

export interface DataStreamStatsWithLevelsPerNamespace extends DataStreamStatsPerNamespace {
  structureLevel: Record<number, number>;
}

export interface DataStreamFieldStatsPerNamespace extends DataStreamStatsWithLevelsPerNamespace {
  uniqueFields: string[];
  fieldsCount: Record<string, number>;
}

export interface DataStreamStats {
  streamName: string;
  shipper?: string;
  totalNamespaces: number;
  totalDocuments: number;
  structureLevel: Record<number, number>;
  failureStoreDocuments: number;
  failureStoreIndices: number;
  totalSize: number;
  totalIndices: number;
  totalFields: number;
  fieldsCount: Record<string, number>;
  managedBy: string[];
  packageName: string[];
  beat: string[];
}

export interface DataTelemetryEvent {
  pattern_name: string;
  shipper?: string;
  doc_count: number;
  structure_level: Record<string, number>;
  failure_store_doc_count: number;
  index_count: number;
  namespace_count: number;
  field_count: number;
  field_existence: Record<string, number>;
  size_in_bytes: number;
  managed_by: string[];
  package_name: string[];
  beat: string[];
}

export interface DataTelemetryObject {
  data: DataTelemetryEvent[];
}

export interface TelemetryTaskState {
  data: DataTelemetryEvent[] | null;
  ran: boolean;
}
