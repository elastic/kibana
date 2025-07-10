/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiPanel,
  EuiTitle,
  EuiIconTip,
  EuiAccordion,
  useGeneratedHtmlId,
  EuiBadge,
  EuiBetaBadge,
  EuiSwitch,
} from '@elastic/eui';
import {
  overviewQualityIssuesSectionTitle,
  overviewQualityIssueSectionTitleTooltip,
  currentIssuesToggleSwitch,
  currentIssuesToggleSwitchTooltip,
  overviewQualityIssuesAccordionTechPreviewBadge,
} from '../../../../../common/translations';
import { QualityIssuesTable } from './table';
import { useQualityIssues } from '../../../../hooks';

export function QualityIssues() {
  const accordionId = useGeneratedHtmlId({
    prefix: overviewQualityIssuesSectionTitle,
  });
  const toggleTextSwitchId = useGeneratedHtmlId({ prefix: 'toggleTextSwitch' });

  const { totalItemCount, toggleCurrentQualityIssues, showCurrentQualityIssues } =
    useQualityIssues();

  const latestBackingIndexToggle = (
    <>
      <EuiSwitch
        label={currentIssuesToggleSwitch}
        checked={showCurrentQualityIssues}
        onChange={toggleCurrentQualityIssues}
        aria-describedby={toggleTextSwitchId}
        compressed
        data-test-subj="datasetQualityDetailsOverviewDegradedFieldToggleSwitch"
        css={{ marginRight: '5px' }}
      />
      <EuiIconTip content={currentIssuesToggleSwitchTooltip} position="top" />
    </>
  );

  const accordionTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
      <EuiTitle size="xxs">
        <h6>{overviewQualityIssuesSectionTitle}</h6>
      </EuiTitle>
      <EuiIconTip content={overviewQualityIssueSectionTitleTooltip} color="subdued" size="m" />
      <EuiBadge
        color="default"
        data-test-subj="datasetQualityDetailsOverviewDegradedFieldTitleCount"
      >
        {totalItemCount}
      </EuiBadge>
      <EuiBetaBadge
        label={overviewQualityIssuesAccordionTechPreviewBadge}
        color="hollow"
        data-test-subj="datasetQualityDetailsOverviewDegradedFieldsTechPreview"
        size="s"
      />
    </EuiFlexGroup>
  );
  return (
    <EuiPanel hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="none"
        initialIsOpen={true}
        extraAction={latestBackingIndexToggle}
        data-test-subj="datasetQualityDetailsOverviewDocumentTrends"
      >
        <QualityIssuesTable />
      </EuiAccordion>
    </EuiPanel>
  );
}
