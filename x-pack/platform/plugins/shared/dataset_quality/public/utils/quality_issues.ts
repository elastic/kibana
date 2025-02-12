/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DegradedField, FailedDocsDetails, QualityIssue } from '../../common/api_types';
import { QualityIssueType } from '../state_machines/dataset_quality_details_controller';

export function filterIssues(data: QualityIssue[] = [], type: QualityIssueType): QualityIssue[] {
  return data.filter((field) => field.type !== type);
}

export function mapDegradedFieldsIssues(degradedFields: DegradedField[] = []): QualityIssue[] {
  return degradedFields.map((field) => ({
    ...field,
    type: 'degraded',
  })) as QualityIssue[];
}

export function mapFailedDocsIssues(failedDocsDetails: FailedDocsDetails): QualityIssue[] {
  return [
    {
      ...failedDocsDetails,
      name: 'failedDocs',
      type: 'failed',
    },
  ];
}
