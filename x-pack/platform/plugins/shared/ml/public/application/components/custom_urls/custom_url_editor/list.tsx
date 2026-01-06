/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ChangeEvent } from 'react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';

import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiToolTip,
  EuiTextArea,
  EuiSpacer,
  useEuiTheme,
  EuiPanel,
  EuiFormLabel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MlUrlConfig, MlKibanaUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import {
  isDataFrameAnalyticsConfigs,
  type DataFrameAnalyticsConfig,
} from '@kbn/ml-data-frame-analytics-utils';
import { parseUrlState } from '@kbn/ml-url-state';
import { parseInterval } from '@kbn/ml-parse-interval';

import { css } from '@emotion/react';
import type { Job } from '../../../../../common';
import { useMlApi, useMlKibana } from '../../../contexts/kibana';
import { useToastNotificationService } from '../../../services/toast_notification_service';
import { isValidLabel, openCustomUrlWindow } from '../../../util/custom_url_utils';
import { getTestUrl } from './utils';

import { TIME_RANGE_TYPE } from './constants';

function isValidTimeRange(timeRange: MlKibanaUrlConfig['time_range']): boolean {
  // Allow empty timeRange string, which gives the 'auto' behaviour.
  if (timeRange === undefined || timeRange.length === 0 || timeRange === TIME_RANGE_TYPE.AUTO) {
    return true;
  }

  const interval = parseInterval(timeRange);
  return interval !== null;
}

function findDFADataViewId(
  dfaJob: DataFrameAnalyticsConfig,
  dataViewListItems?: DataViewListItem[],
  isPartialDFAJob?: boolean
): string | undefined {
  const sourceIndex = Array.isArray(dfaJob.source.index)
    ? dfaJob.source.index.join()
    : dfaJob.source.index;
  const indexName = isPartialDFAJob ? sourceIndex : dfaJob.dest.index;
  const backupIndexName = sourceIndex;
  const dataViewId = dataViewListItems?.find((item) => item.title === indexName)?.id;
  if (!dataViewId) {
    return dataViewListItems?.find((item) => item.title === backupIndexName)?.id;
  }
  return dataViewId;
}

/**
 * Finds the data view ID for a custom URL.
 * For dashboards URLs: Returns the job's destination index data view ID.
 * Uses source index for partial DFA jobs since destination index doesn't exist yet.
 * For discover URLs: Extracts data view ID directly from the URL state.
 */
export function extractDataViewIdFromCustomUrl(
  dfaJob: DataFrameAnalyticsConfig,
  customUrl: MlKibanaUrlConfig,
  dataViewListItems?: DataViewListItem[],
  isPartialDFAJob?: boolean
): string | undefined {
  let dataViewId;

  if (customUrl.url_value.includes('dashboards')) {
    dataViewId = findDFADataViewId(dfaJob, dataViewListItems, isPartialDFAJob);
  } else {
    const urlState = parseUrlState(customUrl.url_value);
    dataViewId = urlState._a?.index;
  }

  return dataViewId;
}

export interface CustomUrlListProps {
  job: Job | DataFrameAnalyticsConfig;
  customUrls: MlUrlConfig[];
  onChange: (customUrls: MlUrlConfig[]) => void;
  dataViewListItems?: DataViewListItem[];
  isPartialDFAJob?: boolean;
}

/*
 * React component for listing the custom URLs added to a job,
 * with buttons for testing and deleting each custom URL.
 */
export const CustomUrlList: FC<CustomUrlListProps> = ({
  job,
  customUrls,
  onChange: setCustomUrls,
  dataViewListItems,
  isPartialDFAJob,
}) => {
  const {
    services: {
      http,
      data: { dataViews },
    },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();
  const mlApi = useMlApi();
  const { displayErrorToast } = useToastNotificationService();
  const [expandedUrlIndex, setExpandedUrlIndex] = useState<number | null>(null);
  const [showTimeRange, setShowTimeRange] = useState<boolean[]>([]);

  const styles = useMemo(
    () => ({
      narrowField: css`
        min-width: calc(${euiTheme.size.xl} * 3);
      `,
      urlField: css`
        min-width: calc(${euiTheme.size.xxxxl} * 4);
      `,
      actionButtons: css`
        max-width: calc(${euiTheme.size.xl} * 3);
      `,
    }),
    [euiTheme.size.xl, euiTheme.size.xxxxl]
  );

  const hasTimeField = useCallback(
    async (dataViewId: string | undefined): Promise<boolean> => {
      if (!dataViewId) return false;
      try {
        const dataView = await dataViews.get(dataViewId);
        return dataView?.timeFieldName !== undefined && dataView?.timeFieldName !== '';
      } catch {
        return true;
      }
    },
    [dataViews]
  );

  const getDiscoverTimeFieldStatus = useCallback(
    async (kibanaUrl: MlKibanaUrlConfig): Promise<boolean | undefined> => {
      if (!kibanaUrl.url_value.includes('discover')) {
        return undefined;
      }
      const urlState = parseUrlState(kibanaUrl.url_value);
      const dataViewId = urlState._a?.index;
      return dataViewId ? await hasTimeField(dataViewId) : true;
    },
    [hasTimeField]
  );

  const getDFATimeFieldStatus = useCallback(async (): Promise<boolean | undefined> => {
    const dataViewId = findDFADataViewId(
      job as DataFrameAnalyticsConfig,
      dataViewListItems,
      isPartialDFAJob
    );

    return dataViewId ? await hasTimeField(dataViewId) : true;
  }, [dataViewListItems, hasTimeField, isPartialDFAJob, job]);

  useEffect(() => {
    if (customUrls.length === 0) return;

    const checkTimeRangeVisibility = async () => {
      const results = await Promise.all(
        customUrls.map(async (customUrl) => {
          const kibanaUrl = customUrl as MlKibanaUrlConfig;

          let dfaHasTimeField: boolean | undefined;
          if (isDataFrameAnalyticsConfigs(job) || isPartialDFAJob) {
            dfaHasTimeField = await getDFATimeFieldStatus();
          }
          const discoverHasTimeField = await getDiscoverTimeFieldStatus(kibanaUrl);

          // Anomaly Detection Jobs logic
          if (dfaHasTimeField === undefined) {
            if (kibanaUrl.url_value.includes('discover')) return discoverHasTimeField === true;
            return true; // Show for dashboards/other/unknown URLs
          }

          // Data Frame Analytics Jobs logic
          if (kibanaUrl.url_value.includes('discover')) {
            // For discover URLs: show only if both DFA and Discover have time fields
            return dfaHasTimeField === true && discoverHasTimeField === true;
          }

          if (kibanaUrl.url_value.includes('dashboards')) {
            // For dashboard URLs: show only if DFA has time field
            return dfaHasTimeField === true;
          }

          return true;
        })
      );
      setShowTimeRange(results);
    };

    checkTimeRangeVisibility();
  }, [
    customUrls,
    job,
    dataViewListItems,
    isPartialDFAJob,
    dataViews,
    getDFATimeFieldStatus,
    getDiscoverTimeFieldStatus,
  ]);

  const onLabelChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    if (index < customUrls.length) {
      customUrls[index] = {
        ...customUrls[index],
        url_name: e.target.value,
      };
      setCustomUrls([...customUrls]);
    }
  };

  const onUrlValueChange = (
    e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
    index: number
  ) => {
    if (index < customUrls.length) {
      customUrls[index] = {
        ...customUrls[index],
        url_value: e.target.value,
      };
      setCustomUrls([...customUrls]);
    }
  };

  const onTimeRangeChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    if (index < customUrls.length) {
      customUrls[index] = {
        ...customUrls[index],
      };

      const timeRange = e.target.value;
      if (timeRange !== undefined && timeRange.length > 0) {
        (customUrls[index] as MlKibanaUrlConfig).time_range = timeRange;
      } else {
        delete (customUrls[index] as MlKibanaUrlConfig).time_range;
      }
      setCustomUrls([...customUrls]);
    }
  };

  const onDeleteButtonClick = (index: number) => {
    if (index < customUrls.length) {
      customUrls.splice(index, 1);
      setCustomUrls([...customUrls]);
    }
  };

  const onTestButtonClick = async (index: number) => {
    const customUrl = customUrls[index] as MlKibanaUrlConfig;
    let timefieldName = null;

    if (
      index < customUrls.length &&
      (isDataFrameAnalyticsConfigs(job) || isPartialDFAJob) &&
      customUrl.time_range !== undefined &&
      customUrl.time_range !== TIME_RANGE_TYPE.AUTO
    ) {
      const dataViewId = extractDataViewIdFromCustomUrl(
        job as DataFrameAnalyticsConfig,
        customUrl,
        dataViewListItems,
        isPartialDFAJob
      );

      if (dataViewId) {
        const dataView = await dataViews.get(dataViewId);
        // DFA job url - need the timefield to test the URL.
        timefieldName = dataView?.timeFieldName ?? null;
      }
    }

    if (index < customUrls.length) {
      try {
        const testUrl = await getTestUrl(
          mlApi,
          job,
          customUrl,
          timefieldName,
          undefined,
          isPartialDFAJob
        );
        openCustomUrlWindow(testUrl, customUrl, http.basePath.get());
      } catch (error) {
        displayErrorToast(
          error,
          i18n.translate(
            'xpack.ml.customUrlEditorList.obtainingUrlToTestConfigurationErrorMessage',
            {
              defaultMessage: 'An error occurred obtaining the URL to test the configuration',
            }
          )
        );
      }
    }
  };

  const customUrlRows = customUrls.map((customUrl, index) => {
    // Validate the label.
    const label = customUrl.url_name;
    const otherUrls = [...customUrls];
    otherUrls.splice(index, 1); // Don't compare label with itself.
    const isInvalidLabel = !isValidLabel(label, otherUrls);
    const invalidLabelError = isInvalidLabel
      ? [
          i18n.translate('xpack.ml.customUrlEditorList.labelIsNotUniqueErrorMessage', {
            defaultMessage: 'A unique label must be supplied',
          }),
        ]
      : [];

    // Validate the time range.
    const timeRange = (customUrl as MlKibanaUrlConfig).time_range;
    const isCustomTimeRange = (customUrl as MlKibanaUrlConfig).is_custom_time_range === true;
    const isInvalidTimeRange = !isValidTimeRange(timeRange);
    const invalidIntervalError = isInvalidTimeRange
      ? [
          i18n.translate('xpack.ml.customUrlEditorList.invalidTimeRangeFormatErrorMessage', {
            defaultMessage: 'Invalid format',
          }),
        ]
      : [];

    return (
      <React.Fragment key={`url_${index}`}>
        <EuiPanel
          data-test-subj={`mlJobEditCustomUrlItem_${index}`}
          role="listitem"
          aria-labelledby={`custom-url-heading-${index}`}
        >
          <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFormLabel id={`custom-url-heading-${index}`}>
                <FormattedMessage
                  id="xpack.ml.customUrlEditorList.customUrlHeading"
                  defaultMessage="Custom URL {indexCount}"
                  values={{ indexCount: index + 1 }}
                />
              </EuiFormLabel>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup responsive={false} gutterSize="xs" css={styles.actionButtons}>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      <FormattedMessage
                        id="xpack.ml.customUrlEditorList.testCustomUrlTooltip"
                        defaultMessage="Test custom URL"
                      />
                    }
                  >
                    <EuiButtonIcon
                      size="s"
                      color="primary"
                      onClick={() => onTestButtonClick(index)}
                      iconType="popout"
                      aria-label={i18n.translate(
                        'xpack.ml.customUrlEditorList.testCustomUrlAriaLabel',
                        {
                          defaultMessage: 'Test custom URL',
                        }
                      )}
                      data-test-subj="mlJobEditTestCustomUrlButton"
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.ml.customUrlEditorList.deleteCustomUrlTooltip"
                          defaultMessage="Delete custom URL"
                        />
                      }
                    >
                      <EuiButtonIcon
                        size="s"
                        color="danger"
                        onClick={() => onDeleteButtonClick(index)}
                        iconType="trash"
                        aria-label={i18n.translate(
                          'xpack.ml.customUrlEditorList.deleteCustomUrlAriaLabel',
                          {
                            defaultMessage: 'Delete custom URL',
                          }
                        )}
                        data-test-subj={`mlJobEditDeleteCustomUrlButton_${index}`}
                      />
                    </EuiToolTip>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} wrap gutterSize="s">
            <EuiFlexItem css={styles.narrowField} grow={2}>
              <EuiFormRow
                fullWidth={true}
                label={
                  <FormattedMessage
                    id="xpack.ml.customUrlEditorList.labelLabel"
                    defaultMessage="Label"
                  />
                }
                isInvalid={isInvalidLabel}
                error={invalidLabelError}
                data-test-subj="mlJobEditCustomUrlItemLabel"
              >
                <EuiFieldText
                  key={`label-field-${index}`}
                  fullWidth={true}
                  value={label}
                  isInvalid={isInvalidLabel}
                  onChange={(e) => onLabelChange(e, index)}
                  data-test-subj={`mlJobEditCustomUrlLabelInput_${index}`}
                  aria-required="true"
                  aria-label={i18n.translate('xpack.ml.customUrlEditorList.labelAriaLabel', {
                    defaultMessage: 'Label for custom URL {indexCount}',
                    values: { indexCount: index + 1 },
                  })}
                  aria-invalid={isInvalidLabel}
                />
              </EuiFormRow>
            </EuiFlexItem>
            {isCustomTimeRange === false && showTimeRange[index] ? (
              <EuiFlexItem css={styles.narrowField} grow={2}>
                <EuiFormRow
                  fullWidth={true}
                  label={
                    <FormattedMessage
                      id="xpack.ml.customUrlEditorList.timeRangeLabel"
                      defaultMessage="Time range"
                    />
                  }
                  error={invalidIntervalError}
                  isInvalid={isInvalidTimeRange}
                >
                  <EuiFieldText
                    fullWidth={true}
                    value={(customUrl as MlKibanaUrlConfig).time_range || ''}
                    isInvalid={isInvalidTimeRange}
                    placeholder={TIME_RANGE_TYPE.AUTO}
                    onChange={(e) => onTimeRangeChange(e, index)}
                    aria-label={i18n.translate('xpack.ml.customUrlEditorList.timeRangeAriaLabel', {
                      defaultMessage: 'Time range for custom URL {indexCount}',
                      values: { indexCount: index + 1 },
                    })}
                    aria-invalid={isInvalidTimeRange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem css={styles.urlField} grow={6}>
              <EuiFormRow
                fullWidth={true}
                label={
                  <FormattedMessage
                    id="xpack.ml.customUrlEditorList.urlLabel"
                    defaultMessage="URL"
                  />
                }
              >
                {index === expandedUrlIndex ? (
                  <EuiTextArea
                    key={`url-textarea-${index}`}
                    inputRef={(input: HTMLTextAreaElement | null) => {
                      if (input) {
                        input.focus();
                      }
                    }}
                    fullWidth={true}
                    value={customUrl.url_value}
                    onChange={(e) => onUrlValueChange(e, index)}
                    onBlur={() => {
                      setExpandedUrlIndex(null);
                    }}
                    aria-required="true"
                    aria-label={i18n.translate('xpack.ml.customUrlEditorList.urlValueAriaLabel', {
                      defaultMessage: 'URL value for {label}',
                      values: {
                        label,
                      },
                    })}
                    data-test-subj={`mlJobEditCustomUrlTextarea_${index}`}
                  />
                ) : (
                  <EuiFieldText
                    key={`url-field-${index}`}
                    fullWidth={true}
                    value={customUrl.url_value}
                    onChange={() => {}} // satisfy React's requirement
                    onFocus={() => setExpandedUrlIndex(index)}
                    aria-required="true"
                    aria-label={i18n.translate(
                      'xpack.ml.customUrlEditorList.urlFieldExpandAriaLabel',
                      {
                        defaultMessage: 'URL value for {label}. Click to expand for editing.',
                        values: {
                          label,
                        },
                      }
                    )}
                    data-test-subj={`mlJobEditCustomUrlInput_${index}`}
                  />
                )}
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  });

  return (
    <div
      role="list"
      data-test-subj="mlJobEditCustomUrlsList"
      aria-label={i18n.translate('xpack.ml.customUrlEditorList.configurationsListAriaLabel', {
        defaultMessage: 'Custom URL configurations',
      })}
    >
      {customUrlRows}
    </div>
  );
};
