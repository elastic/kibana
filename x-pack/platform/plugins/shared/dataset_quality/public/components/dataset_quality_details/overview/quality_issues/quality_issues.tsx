/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiSpacer, EuiTitle, EuiFilterGroup, EuiIconTip } from '@elastic/eui';
import { QualityIssuesTable } from './table';
import {
  issuesTableName,
  overviewQualityIssueSectionTitleTooltip,
} from '../../../../../common/translations';
import { FieldSelector, CurrentQualityIssuesToggle, IssueTypeSelector } from './filters';

export function QualityIssues() {
  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        data-test-subj="datasetQualityDetailsFiltersContainer"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
          <EuiTitle size="xs">
            <span>{issuesTableName}</span>
          </EuiTitle>
          <EuiIconTip type="info" content={overviewQualityIssueSectionTitleTooltip} size="m" />
        </EuiFlexGroup>
        <EuiFilterGroup compressed>
          <FieldSelector />
          <IssueTypeSelector />
          <CurrentQualityIssuesToggle />
        </EuiFilterGroup>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <QualityIssuesTable />
    </>
  );
}
