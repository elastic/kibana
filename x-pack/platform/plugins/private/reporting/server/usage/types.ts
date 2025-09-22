/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ReportingUsage {
  has_errors: boolean;
  error_messages?: string[];
  number_of_scheduled_reports: number;
  number_of_enabled_scheduled_reports: number;
  number_of_scheduled_reports_by_type: Record<string, number>;
  number_of_enabled_scheduled_reports_by_type: Record<string, number>;
  number_of_scheduled_reports_with_notifications: number;
}
