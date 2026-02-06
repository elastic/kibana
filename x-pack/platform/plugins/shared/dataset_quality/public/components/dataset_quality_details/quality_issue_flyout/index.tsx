/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiFlyoutFooter,
  useGeneratedHtmlId,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { FAILURE_STORE_SELECTOR } from '../../../../common/constants';
import { _IGNORED } from '../../../../common/es_fields';
import {
  degradedFieldMessageIssueDoesNotExistInLatestIndex,
  fieldIgnoredText,
  flyoutCancelText,
  discoverAriaText,
  openInDiscoverText,
} from '../../../../common/translations';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useQualityIssues,
  useRedirectLink,
} from '../../../hooks';
import { NavigationSource } from '../../../services/telemetry';
import DegradedFieldFlyout from './degraded_field';
import FailedDocsFlyout from './failed_docs';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function QualityIssueFlyout() {
  const {
    closeDegradedFieldFlyout,
    expandedDegradedField,
    renderedItems,
    isAnalysisInProgress,
    degradedFieldAnalysisFormattedResult,
    isDegradedFieldsValueLoading,
  } = useQualityIssues();
  const { dataStreamSettings, datasetDetails, timeRange, view } = useDatasetQualityDetailsState();
  const pushedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'pushedFlyoutTitle',
  });

  const fieldList = useMemo(() => {
    return renderedItems.find((item) => {
      return item.name === expandedDegradedField?.name && item.type === expandedDegradedField?.type;
    });
  }, [renderedItems, expandedDegradedField]);

  const isUserViewingTheIssueOnLatestBackingIndex =
    dataStreamSettings?.lastBackingIndexName === fieldList?.indexFieldWasLastPresentIn;

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query: { language: 'kuery', query: `${_IGNORED}: ${expandedDegradedField}` },
    navigationSource: NavigationSource.DegradedFieldFlyoutHeader,
  });

  const redirectLinkProps = useRedirectLink({
    dataStreamStat: datasetDetails.rawName,
    timeRangeConfig: timeRange,
    query: {
      language: 'kuery',
      query:
        expandedDegradedField && expandedDegradedField.type === 'degraded'
          ? `${_IGNORED}: ${expandedDegradedField.name}`
          : '',
    },
    selector:
      expandedDegradedField && expandedDegradedField.type === 'failed'
        ? FAILURE_STORE_SELECTOR
        : undefined,
    sendTelemetry,
  });

  return (
    <EuiFlyout
      type="push"
      size="s"
      onClose={closeDegradedFieldFlyout}
      aria-labelledby={pushedFlyoutTitleId}
      data-test-subj={'datasetQualityDetailsDegradedFieldFlyout'}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
          <EuiTitle size="m">
            <EuiText>
              {expandedDegradedField?.type === 'degraded' ? (
                <>
                  {expandedDegradedField?.name} {fieldIgnoredText}
                </>
              ) : (
                <span style={{ fontWeight: 400 }}>
                  {i18n.translate(
                    'xpack.datasetQuality.datasetQualityDetails.qualityIssueFlyout.failedDocsTitle',
                    {
                      defaultMessage: 'Documents indexing failed',
                    }
                  )}
                </span>
              )}
            </EuiText>
          </EuiTitle>
        </EuiFlexGroup>
        {expandedDegradedField?.type === 'degraded' &&
          !isUserViewingTheIssueOnLatestBackingIndex && (
            <>
              <EuiSpacer size="s" />
              <EuiTextColor
                color="danger"
                data-test-subj="datasetQualityDetailsDegradedFieldFlyoutIssueDoesNotExist"
              >
                {degradedFieldMessageIssueDoesNotExistInLatestIndex}
              </EuiTextColor>
            </>
          )}
        {expandedDegradedField?.type === 'degraded' &&
          isUserViewingTheIssueOnLatestBackingIndex &&
          !isAnalysisInProgress &&
          degradedFieldAnalysisFormattedResult &&
          !degradedFieldAnalysisFormattedResult.identifiedUsingHeuristics &&
          !isDegradedFieldsValueLoading &&
          view !== 'wired' && (
            <>
              <EuiSpacer size="s" />
              <EuiTextColor
                color="danger"
                data-test-subj="datasetQualityDetailsDegradedFieldFlyoutIssueDoesNotExist"
              >
                <FormattedMessage
                  id="xpack.datasetQuality.details.degradedField.potentialCause.ignoreMalformedWarning"
                  defaultMessage="If you've recently updated your {field_limit} settings, this quality issue may not be relevant. Rollover the data stream to verify."
                  values={{
                    field_limit: (
                      <strong>
                        {i18n.translate(
                          'xpack.datasetQuality.degradedFieldFlyout.strong.fieldLimitLabel',
                          { defaultMessage: 'field limit' }
                        )}
                      </strong>
                    ),
                  }}
                />
              </EuiTextColor>
            </>
          )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {expandedDegradedField?.type === 'degraded' && <DegradedFieldFlyout />}
        {expandedDegradedField?.type === 'failed' && <FailedDocsFlyout />}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeDegradedFieldFlyout}>{flyoutCancelText}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              aria-label={discoverAriaText}
              size="s"
              data-test-subj="datasetQualityDetailsDegradedFieldFlyoutTitleLinkToDiscover"
              {...redirectLinkProps.linkProps}
            >
              {openInDiscoverText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
