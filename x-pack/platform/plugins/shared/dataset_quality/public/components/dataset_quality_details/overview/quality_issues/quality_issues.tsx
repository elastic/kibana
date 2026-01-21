/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiSpacer,
  EuiTitle,
  EuiFilterGroup,
  EuiIconTip,
  EuiBetaBadge,
} from '@elastic/eui';
import { QualityIssuesTable } from './table';
import {
  issuesTableName,
  overviewQualityIssueSectionTitleTooltip,
  overviewQualityIssuesAccordionTechPreviewBadge,
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
          <EuiIconTip content={overviewQualityIssueSectionTitleTooltip} color="subdued" size="m" />
          <EuiBetaBadge
            label={overviewQualityIssuesAccordionTechPreviewBadge}
            color="hollow"
            data-test-subj="datasetQualityDetailsOverviewDegradedFieldsTechPreview"
            size="s"
          />
        </EuiFlexGroup>
        <EuiFilterGroup>
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
