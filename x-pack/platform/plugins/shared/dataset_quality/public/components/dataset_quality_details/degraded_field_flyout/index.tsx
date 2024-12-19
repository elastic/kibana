/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
  EuiTextColor,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NavigationSource } from '../../../services/telemetry';
import {
  useDatasetDetailsRedirectLinkTelemetry,
  useDatasetQualityDetailsState,
  useDegradedFields,
  useRedirectLink,
} from '../../../hooks';
import {
  degradedFieldMessageIssueDoesNotExistInLatestIndex,
  discoverAriaText,
  fieldIgnoredText,
  logsExplorerAriaText,
  openInDiscoverText,
  openInLogsExplorerText,
  overviewDegradedFieldsSectionTitle,
} from '../../../../common/translations';
import { DegradedFieldInfo } from './field_info';
import { _IGNORED } from '../../../../common/es_fields';
import { PossibleMitigations } from './possible_mitigations';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function DegradedFieldFlyout() {
  const {
    closeDegradedFieldFlyout,
    expandedDegradedField,
    renderedItems,
    isAnalysisInProgress,
    degradedFieldAnalysisFormattedResult,
  } = useDegradedFields();
  const { dataStreamSettings, datasetDetails, timeRange } = useDatasetQualityDetailsState();
  const pushedFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'pushedFlyoutTitle',
  });

  const fieldList = useMemo(() => {
    return renderedItems.find((item) => {
      return item.name === expandedDegradedField;
    });
  }, [renderedItems, expandedDegradedField]);

  const isUserViewingTheIssueOnLatestBackingIndex =
    dataStreamSettings?.lastBackingIndexName === fieldList?.indexFieldWasLastPresentIn;

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query: { language: 'kuery', query: `${_IGNORED}: ${expandedDegradedField}` },
    navigationSource: NavigationSource.DegradedFieldFlyoutHeader,
  });

  const redirectLinkProps = useRedirectLink({
    dataStreamStat: datasetDetails,
    timeRangeConfig: timeRange,
    query: { language: 'kuery', query: `${_IGNORED}: ${expandedDegradedField}` },
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
        <EuiBadge color="warning">{overviewDegradedFieldsSectionTitle}</EuiBadge>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
          <EuiTitle size="m">
            <EuiText>
              {expandedDegradedField} <span style={{ fontWeight: 400 }}>{fieldIgnoredText}</span>
            </EuiText>
          </EuiTitle>
          <EuiToolTip
            content={
              redirectLinkProps.isLogsExplorerAvailable
                ? openInLogsExplorerText
                : openInDiscoverText
            }
          >
            <EuiButtonIcon
              display="base"
              iconType={
                redirectLinkProps.isLogsExplorerAvailable ? 'logoObservability' : 'discoverApp'
              }
              aria-label={
                redirectLinkProps.isLogsExplorerAvailable ? logsExplorerAriaText : discoverAriaText
              }
              size="s"
              data-test-subj="datasetQualityDetailsDegradedFieldFlyoutTitleLinkToDiscover"
              {...redirectLinkProps.linkProps}
            />
          </EuiToolTip>
        </EuiFlexGroup>
        {!isUserViewingTheIssueOnLatestBackingIndex && (
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
        {isUserViewingTheIssueOnLatestBackingIndex &&
          !isAnalysisInProgress &&
          degradedFieldAnalysisFormattedResult &&
          !degradedFieldAnalysisFormattedResult.identifiedUsingHeuristics && (
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
        <DegradedFieldInfo fieldList={fieldList} />
        {isUserViewingTheIssueOnLatestBackingIndex && (
          <>
            <EuiSpacer size="s" />
            <PossibleMitigations />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
