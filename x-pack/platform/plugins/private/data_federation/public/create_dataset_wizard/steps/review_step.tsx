/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataSource } from '../../../common';
import { datasetWizardStrings } from '../dataset_wizard_i18n';
import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  buildDatasetPayloadFromWizardValues,
  buildDatasetRequestText,
  getReviewLogisticsRows,
  getReviewSchemaMappingRows,
  getReviewSettingsRows,
  type ReviewSettingBadge,
  type ReviewSummaryRow,
} from '../review_step_utils';

export interface ReviewStepProps {
  values: DatasetWizardFormValues;
  dataSources: DataSource[];
}

const SettingBadge = ({ badge }: { badge: ReviewSettingBadge }) => (
  <EuiBadge
    color={badge === 'default' ? 'hollow' : 'accent'}
    data-test-subj={`datasetWizardReviewBadge-${badge}`}
  >
    {badge === 'default'
      ? datasetWizardStrings.reviewDefaultBadge()
      : datasetWizardStrings.reviewModifiedBadge()}
  </EuiBadge>
);

const SummaryDescriptionList = ({
  rows,
  testSubj,
}: {
  rows: ReviewSummaryRow[];
  testSubj: string;
}) => (
  <EuiDescriptionList textStyle="reverse" compressed data-test-subj={testSubj}>
    {rows.map((row) => (
      <React.Fragment key={row.label}>
        <EuiDescriptionListTitle>{row.label}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          {row.displayValue}
          {row.badge ? (
            <>
              {' '}
              <SettingBadge badge={row.badge} />
            </>
          ) : null}
        </EuiDescriptionListDescription>
      </React.Fragment>
    ))}
  </EuiDescriptionList>
);

export const ReviewStep: FunctionComponent<ReviewStepProps> = ({ values, dataSources }) => {
  const logisticsRows = useMemo(
    () => getReviewLogisticsRows(values, dataSources),
    [dataSources, values]
  );
  const settingsRows = useMemo(
    () => getReviewSettingsRows(values.settings, values.resource),
    [values.resource, values.settings]
  );
  const schemaMappingRows = useMemo(() => getReviewSchemaMappingRows(values), [values]);

  const requestText = useMemo(() => buildDatasetRequestText(values), [values]);
  const previewPayload = useMemo(() => buildDatasetPayloadFromWizardValues(values), [values]);

  const previewJson = useMemo(() => JSON.stringify(previewPayload, null, 2), [previewPayload]);
  const requestLanguage = requestText.length < 60000 ? 'json' : undefined;

  const SummaryTab = () => (
    <div data-test-subj="datasetWizardReviewSummaryTab">
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{datasetWizardStrings.reviewLogisticsSectionTitle()}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <SummaryDescriptionList rows={logisticsRows} testSubj="datasetWizardReviewLogistics" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{datasetWizardStrings.reviewSettingsSectionTitle()}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {settingsRows.length > 0 ? (
            <SummaryDescriptionList rows={settingsRows} testSubj="datasetWizardReviewSettings" />
          ) : (
            <EuiText size="s" color="subdued" data-test-subj="datasetWizardReviewSettingsEmpty">
              {datasetWizardStrings.reviewNoSettingsValue()}
            </EuiText>
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{datasetWizardStrings.reviewSchemaMappingsSectionTitle()}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <SummaryDescriptionList
            rows={schemaMappingRows}
            testSubj="datasetWizardReviewSchemaMappings"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );

  const PreviewTab = () => (
    <div data-test-subj="datasetWizardReviewPreviewTab">
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.reviewPreviewDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCodeBlock language="json" isCopyable data-test-subj="datasetWizardReviewPreviewCode">
        {previewJson}
      </EuiCodeBlock>
    </div>
  );

  const RequestTab = () => (
    <div data-test-subj="datasetWizardReviewRequestTab">
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.reviewRequestDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCodeBlock
        language={requestLanguage}
        isCopyable
        data-test-subj="datasetWizardReviewRequestCode"
      >
        {requestText}
      </EuiCodeBlock>
    </div>
  );

  const tabs = [
    {
      id: 'summary',
      name: datasetWizardStrings.reviewSummaryTabTitle(),
      content: <SummaryTab />,
      'data-test-subj': 'datasetWizardReviewSummaryTabButton',
    },
    {
      id: 'preview',
      name: datasetWizardStrings.reviewPreviewTabTitle(),
      content: <PreviewTab />,
      'data-test-subj': 'datasetWizardReviewPreviewTabButton',
    },
    {
      id: 'request',
      name: datasetWizardStrings.reviewRequestTabTitle(),
      content: <RequestTab />,
      'data-test-subj': 'datasetWizardReviewRequestTabButton',
    },
  ];

  return (
    <div data-test-subj="datasetWizardReviewStep">
      <EuiTitle size="s">
        <h3>{datasetWizardStrings.reviewTitle(values.name.trim() || datasetWizardStrings.reviewUntitledDataset())}</h3>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiTabbedContent tabs={tabs} data-test-subj="datasetWizardReviewTabs" />
    </div>
  );
};
