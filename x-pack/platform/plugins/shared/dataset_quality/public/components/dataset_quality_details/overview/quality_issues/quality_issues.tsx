/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSpacer, EuiTitle, EuiFilterGroup } from '@elastic/eui';
import { QualityIssuesTable } from './table';
import { issuesTableName } from '../../../../../common/translations';
import { FieldSelector, DegradedFieldsToggleButton, IssueTypeSelector } from './filters';

export function QualityIssues() {
  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        data-test-subj="datasetQualityDetailsFiltersContainer"
      >
        <EuiTitle size="xxs">
          <h4>{issuesTableName}</h4>
        </EuiTitle>
        <EuiFilterGroup>
          <FieldSelector />
          <IssueTypeSelector />
          <DegradedFieldsToggleButton />
        </EuiFilterGroup>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <QualityIssuesTable />
    </>
  );
}
