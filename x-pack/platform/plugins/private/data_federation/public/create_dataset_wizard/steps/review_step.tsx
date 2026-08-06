/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
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
  useEuiTheme,
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
import { TestConfigurationPreviewContent } from '../test_configuration_preview';
import { getSchemaSamplePreviewTableHeight } from '../schema_sample_preview_table';
import { TEST_CONFIGURATION_PREVIEW_ROW_COUNT } from '../test_configuration_preview_utils';

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
  testSubj?: string;
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

const REVIEW_SETTINGS_TWO_COLUMN_THRESHOLD = 10;

const splitSummaryRows = (rows: ReviewSummaryRow[]): [ReviewSummaryRow[], ReviewSummaryRow[]] => {
  const midpoint = Math.ceil(rows.length / 2);

  return [rows.slice(0, midpoint), rows.slice(midpoint)];
};

const SettingsSummarySection = ({ rows }: { rows: ReviewSummaryRow[] }) => {
  if (rows.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="datasetWizardReviewSettingsEmpty">
        {datasetWizardStrings.reviewNoSettingsValue()}
      </EuiText>
    );
  }

  if (rows.length < REVIEW_SETTINGS_TWO_COLUMN_THRESHOLD) {
    return <SummaryDescriptionList rows={rows} testSubj="datasetWizardReviewSettings" />;
  }

  const [settingsRowsLeft, settingsRowsRight] = splitSummaryRows(rows);

  return (
    <EuiFlexGroup
      alignItems="flexStart"
      gutterSize="l"
      data-test-subj="datasetWizardReviewSettingsTwoColumn"
    >
      <EuiFlexItem grow={1}>
        <SummaryDescriptionList rows={settingsRowsLeft} testSubj="datasetWizardReviewSettingsLeft" />
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        <SummaryDescriptionList rows={settingsRowsRight} testSubj="datasetWizardReviewSettingsRight" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ReviewStep: FunctionComponent<ReviewStepProps> = ({ values, dataSources }) => {
  const { euiTheme } = useEuiTheme();

  const reviewTabContentAreaHeight = useMemo(
    () => getSchemaSamplePreviewTableHeight(euiTheme, TEST_CONFIGURATION_PREVIEW_ROW_COUNT),
    [euiTheme]
  );

  const reviewTabPanelHeight = useMemo(
    () =>
      `calc(${euiTheme.size.m} + ${euiTheme.size.m} + ${euiTheme.size.l} + ${reviewTabContentAreaHeight})`,
    [euiTheme.size.l, euiTheme.size.m, reviewTabContentAreaHeight]
  );

  const reviewTabPanelStyles = useMemo(
    () => css`
      height: ${reviewTabPanelHeight};
      max-height: ${reviewTabPanelHeight};
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    `,
    [reviewTabPanelHeight]
  );

  const reviewTabContentAreaStyles = useMemo(
    () => css`
      height: ${reviewTabContentAreaHeight};
      min-height: ${reviewTabContentAreaHeight};
      max-height: ${reviewTabContentAreaHeight};
      overflow: auto;
      padding-right: ${euiTheme.size.xs};
      box-sizing: border-box;
    `,
    [euiTheme.size.xs, reviewTabContentAreaHeight]
  );

  const reviewTabCodeBlockAreaStyles = useMemo(
    () => css`
      height: ${reviewTabContentAreaHeight};
      min-height: ${reviewTabContentAreaHeight};
      max-height: ${reviewTabContentAreaHeight};
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    `,
    [reviewTabContentAreaHeight]
  );

  const logisticsRows = useMemo(
    () => getReviewLogisticsRows(values, dataSources),
    [dataSources, values]
  );
  const settingsRows = useMemo(
    () => getReviewSettingsRows(values.settings, values.resource),
    [values.resource, values.settings]
  );
  const schemaMappingRows = useMemo(() => getReviewSchemaMappingRows(values), [values]);
  const useTwoColumnSettings = settingsRows.length >= REVIEW_SETTINGS_TWO_COLUMN_THRESHOLD;

  const requestText = useMemo(() => buildDatasetRequestText(values), [values]);
  const previewPayload = useMemo(() => buildDatasetPayloadFromWizardValues(values), [values]);
  const previewJson = useMemo(() => JSON.stringify(previewPayload, null, 2), [previewPayload]);
  const requestLanguage = requestText.length < 60000 ? 'json' : undefined;

  const SummaryTab = () => (
    <div css={reviewTabPanelStyles} data-test-subj="datasetWizardReviewSummaryTab">
      <EuiSpacer size="m" />
      <div css={reviewTabContentAreaStyles} data-test-subj="datasetWizardReviewSummaryScroll">
        <EuiFlexGroup alignItems="flexStart">
          <EuiFlexItem grow={1}>
            <EuiTitle size="xxs">
              <h4>{datasetWizardStrings.reviewLogisticsSectionTitle()}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <SummaryDescriptionList rows={logisticsRows} testSubj="datasetWizardReviewLogistics" />
          </EuiFlexItem>
          <EuiFlexItem grow={useTwoColumnSettings ? 2 : 1}>
            <EuiTitle size="xxs">
              <h4>{datasetWizardStrings.reviewSettingsSectionTitle()}</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <SettingsSummarySection rows={settingsRows} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
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
    </div>
  );

  const PreviewTab = () => (
    <div css={reviewTabPanelStyles} data-test-subj="datasetWizardReviewPreviewTab">
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.reviewPreviewDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <div css={reviewTabCodeBlockAreaStyles} data-test-subj="datasetWizardReviewPreviewCodeScroll">
        <EuiCodeBlock
          language="json"
          isCopyable
          overflowHeight="100%"
          data-test-subj="datasetWizardReviewPreviewCode"
        >
          {previewJson}
        </EuiCodeBlock>
      </div>
    </div>
  );

  const PreviewResultsTab = () => (
    <div css={reviewTabPanelStyles} data-test-subj="datasetWizardReviewPreviewResultsTab">
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.testConfigurationPreviewDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <TestConfigurationPreviewContent
        values={values}
        maxVisibleRows={TEST_CONFIGURATION_PREVIEW_ROW_COUNT}
      />
    </div>
  );

  const RequestTab = () => (
    <div css={reviewTabPanelStyles} data-test-subj="datasetWizardReviewRequestTab">
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>{datasetWizardStrings.reviewRequestDescription()}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <div css={reviewTabCodeBlockAreaStyles} data-test-subj="datasetWizardReviewRequestCodeScroll">
        <EuiCodeBlock
          language={requestLanguage}
          isCopyable
          overflowHeight="100%"
          data-test-subj="datasetWizardReviewRequestCode"
        >
          {requestText}
        </EuiCodeBlock>
      </div>
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
      id: 'preview_results',
      name: datasetWizardStrings.reviewPreviewResultsTabTitle(),
      content: <PreviewResultsTab />,
      'data-test-subj': 'datasetWizardReviewPreviewResultsTabButton',
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
