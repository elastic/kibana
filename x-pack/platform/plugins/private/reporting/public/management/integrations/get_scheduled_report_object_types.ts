/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ClientConfigType } from '@kbn/reporting-public';

/**
 * Object types that can register the `scheduledReports` share integration.
 * CSV scheduling is Discover-only (`search`); screenshot scheduling requires PDF/PNG.
 */
export const getScheduledReportObjectTypes = (
  exportTypes: ClientConfigType['export_types']
): string[] => {
  const objectTypes: string[] = [];

  if (exportTypes.csv.enabled) {
    objectTypes.push('search');
  }

  if (exportTypes.pdf.enabled || exportTypes.png.enabled) {
    objectTypes.push('dashboard', 'lens', 'visualization');
  }

  if (exportTypes.pdf.enabled) {
    objectTypes.push('ai_value_report');
  }

  return objectTypes;
};
