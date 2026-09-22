/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import { FILE_UPLOAD_EVENT } from './register_telemetry';

interface FileAnalysisEvent {
  upload_session_id: string;
  file_id: string;
  file_type: string;
  file_extension: string;
  file_size_bytes: number;
  num_lines_analyzed: number;
  num_messages_analyzed: number;
  java_timestamp_formats: string;
  num_fields_found: number;
  delimiter: string;
  preview_success: boolean;
  analysis_success: boolean;
  analysis_cancelled: boolean;
  overrides_used: boolean;
  analysis_time_ms: number;
  location?: string;
}

interface FileUploadEvent {
  upload_session_id: string;
  file_id: string;
  mapping_clash_new_fields: number;
  mapping_clash_missing_fields: number;
  file_size_bytes: number;
  documents_success: number;
  documents_failed: number;
  upload_success: boolean;
  upload_cancelled: boolean;
  upload_time_ms: number;
  file_extension: string;
  location?: string;
}

interface UploadSessionEvent {
  upload_session_id: string;
  total_files: number;
  total_size_bytes: number;
  session_success: boolean;
  session_cancelled: boolean;
  session_time_ms: number;
  new_index_created: boolean;
  data_view_created: boolean;
  mapping_clash_total_new_fields: number;
  mapping_clash_total_missing_fields: number;
  contains_auto_added_semantic_text_field: boolean;
  location?: string;
}

export class FileUploadTelemetryService {
  constructor(private analytics: AnalyticsServiceStart, private location: string) {}

  public static generateId(): string {
    return crypto.randomUUID().substring(0, 13);
  }

  public static getFileExtension(fileName: string): string {
    return fileName.split('.').pop() ?? 'unknown';
  }

  private reportEvent(eventType: string, eventData: Record<string, unknown>) {
    try {
      this.analytics.reportEvent(eventType, eventData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Failed to report telemetry event', error);
    }
  }

  public trackAnalyzeFile(fileUploadEvent: FileAnalysisEvent) {
    this.reportEvent(FILE_UPLOAD_EVENT.FILE_ANALYSIS, {
      ...fileUploadEvent,
      location: this.location,
    });
  }

  public trackUploadFile(fileUploadEvent: FileUploadEvent) {
    this.reportEvent(FILE_UPLOAD_EVENT.FILE_UPLOAD, {
      ...fileUploadEvent,
      location: this.location,
    });
  }

  public trackUploadSession(uploadSessionEvent: UploadSessionEvent) {
    this.reportEvent(FILE_UPLOAD_EVENT.UPLOAD_SESSION, {
      ...uploadSessionEvent,
      location: this.location,
    });
  }
}
