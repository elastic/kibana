/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent, FC } from 'react';
import React, { useState, useRef, useEffect } from 'react';
import { type Moment } from 'moment';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { MlUrlConfig } from '@kbn/ml-anomaly-utils';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { DashboardItems } from '../../../services/dashboard_service';
import type { CustomUrlSettings } from './utils';
import { isValidCustomUrlSettingsTimeRange } from './utils';
import { isValidLabel } from '../../../util/custom_url_utils';
import { type Job } from '../../../../../common/types/anomaly_detection_jobs';

import type { TimeRangeType } from './constants';
import { TIME_RANGE_TYPE, URL_TYPE } from './constants';
import { CustomTimeRangePicker } from './custom_time_range_picker';
import { useMlKibana } from '../../../contexts/kibana';
import { getDropDownOptions } from './get_dropdown_options';
import { IntervalTimerangeSelector } from './interval_time_range_selector';

function getLinkToOptions() {
  return [
    {
      id: URL_TYPE.KIBANA_DASHBOARD,
      label: i18n.translate('xpack.ml.customUrlEditor.kibanaDashboardLabel', {
        defaultMessage: 'Kibana dashboard',
      }),
    },
    {
      id: URL_TYPE.KIBANA_DISCOVER,
      label: i18n.translate('xpack.ml.customUrlEditor.discoverLabel', {
        defaultMessage: 'Discover',
      }),
    },
    {
      id: URL_TYPE.OTHER,
      label: i18n.translate('xpack.ml.customUrlEditor.otherLabel', {
        defaultMessage: 'Other',
      }),
    },
  ];
}

interface CustomUrlEditorProps {
  customUrl: CustomUrlSettings | undefined;
  setEditCustomUrl: (url: CustomUrlSettings) => void;
  savedCustomUrls: MlUrlConfig[];
  dashboards: DashboardItems;
  dataViewListItems: DataViewListItem[];
  showCustomTimeRangeSelector: boolean;
  job: Job | DataFrameAnalyticsConfig;
  isPartialDFAJob?: boolean;
}

/*
 * React component for the form for editing a custom URL.
 */
export const CustomUrlEditor: FC<CustomUrlEditorProps> = ({
  customUrl,
  setEditCustomUrl,
  savedCustomUrls,
  dashboards,
  dataViewListItems,
  showCustomTimeRangeSelector,
  job,
  isPartialDFAJob,
}) => {
  const [queryEntityFieldNames, setQueryEntityFieldNames] = useState<string[]>([]);
  const [hasTimefield, setHasTimefield] = useState<boolean>(false);
  const [addIntervalTimerange, setAddIntervalTimerange] = useState<boolean>(false);

  const {
    services: {
      data: { dataViews },
    },
  } = useMlKibana();

  const isFirst = useRef(true);

  useEffect(() => {
    async function getQueryEntityDropdownOptions() {
      let dataViewToUse: DataView | undefined;
      const dataViewId = customUrl?.kibanaSettings?.discoverIndexPatternId;

      try {
        dataViewToUse = await dataViews.get(dataViewId ?? '');
      } catch (e) {
        dataViewToUse = undefined;
      }
      if (dataViewToUse && dataViewToUse.timeFieldName) {
        setHasTimefield(true);
      }
      const dropDownOptions = await getDropDownOptions(
        isFirst.current,
        job,
        dataViewToUse,
        isPartialDFAJob
      );
      setQueryEntityFieldNames(dropDownOptions);

      if (isFirst.current) {
        isFirst.current = false;
      }
    }

    if (job !== undefined) {
      getQueryEntityDropdownOptions();
    }
  }, [dataViews, job, customUrl?.kibanaSettings?.discoverIndexPatternId, isPartialDFAJob]);

  useEffect(() => {
    if (addIntervalTimerange === false) {
      // Reset timeRange when not using interval time range
      setEditCustomUrl({
        ...customUrl,
        timeRange: { type: TIME_RANGE_TYPE.AUTO, interval: '' },
      } as CustomUrlSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addIntervalTimerange, setEditCustomUrl]);

  if (customUrl === undefined) {
    return null;
  }

  const onLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditCustomUrl({
      ...customUrl,
      label: e.target.value,
    });
  };

  const onTypeChange = (linkType: string) => {
    setEditCustomUrl({
      ...customUrl,
      type: linkType,
    });
  };

  const onCustomTimeRangeChange = (customTimeRange?: { start: Moment; end: Moment }) => {
    setEditCustomUrl({
      ...customUrl,
      customTimeRange,
      // Reset timeRange when using customTimeRange
      timeRange: { type: TIME_RANGE_TYPE.AUTO, interval: '' },
    });
  };

  const onDashboardChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kibanaSettings = customUrl.kibanaSettings;
    setEditCustomUrl({
      ...customUrl,
      kibanaSettings: {
        ...kibanaSettings,
        dashboardId: e.target.value,
      },
    });
  };

  const onDiscoverIndexPatternChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const kibanaSettings = customUrl.kibanaSettings;
    setEditCustomUrl({
      ...customUrl,
      kibanaSettings: {
        ...kibanaSettings,
        discoverIndexPatternId: e.target.value,
        queryFieldNames: [],
      },
    });
  };

  const onQueryEntitiesChange = (selectedOptions: EuiComboBoxOptionOption[]) => {
    const selectedFieldNames = selectedOptions.map((option) => option.label);

    const kibanaSettings = customUrl.kibanaSettings;
    setEditCustomUrl({
      ...customUrl,
      kibanaSettings: {
        ...kibanaSettings,
        queryFieldNames: selectedFieldNames,
      },
    });
  };

  const onOtherUrlValueChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setEditCustomUrl({
      ...customUrl,
      otherUrlSettings: {
        urlValue: e.target.value,
      },
    });
  };

  const onTimeRangeTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const timeRange = customUrl.timeRange;
    setEditCustomUrl({
      ...customUrl,
      timeRange: {
        ...timeRange,
        type: e.target.value as TimeRangeType,
      },
    });
  };

  const onTimeRangeIntervalChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditCustomUrl({
      ...customUrl,
      timeRange: {
        type: TIME_RANGE_TYPE.INTERVAL,
        interval: e.target.value,
      },
      // Reset customTimeRange to undefined when using interval timeRange
      customTimeRange: undefined,
    });
  };

  const { label, type, timeRange, kibanaSettings, otherUrlSettings } = customUrl;

  const dashboardOptions = dashboards.map((dashboard) => {
    return { value: dashboard.id, text: dashboard.attributes.title };
  });

  const dataViewOptions = dataViewListItems.map(({ id, title }) => {
    return { value: id, text: title };
  });

  const entityOptions = queryEntityFieldNames.map((fieldName) => ({ label: fieldName }));
  let selectedEntityOptions: EuiComboBoxOptionOption[] = [];
  if (kibanaSettings !== undefined && kibanaSettings.queryFieldNames !== undefined) {
    const queryFieldNames: string[] = kibanaSettings.queryFieldNames;
    selectedEntityOptions = queryFieldNames.map((fieldName) => ({ label: fieldName }));
  }

  const timeRangeOptions = Object.values(TIME_RANGE_TYPE).map((timeRangeType) => ({
    value: timeRangeType,
    text: timeRangeType,
  }));

  const isInvalidLabel = !isValidLabel(label, savedCustomUrls);
  const invalidLabelError = isInvalidLabel
    ? [
        i18n.translate('xpack.ml.customUrlsEditor.invalidLabelErrorMessage', {
          defaultMessage: 'A unique label must be supplied',
        }),
      ]
    : [];

  const isInvalidTimeRange = !isValidCustomUrlSettingsTimeRange(timeRange);
  const invalidIntervalError = isInvalidTimeRange
    ? [
        i18n.translate('xpack.ml.customUrlsList.invalidIntervalFormatErrorMessage', {
          defaultMessage: 'Invalid interval format',
        }),
      ]
    : [];

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ml.customUrlsEditor.createNewCustomUrlTitle"
            defaultMessage="Create new custom URL"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiForm className="ml-edit-url-form" data-test-subj="mlJobCustomUrlForm">
        <EuiFormRow
          label={
            <FormattedMessage id="xpack.ml.customUrlsEditor.labelLabel" defaultMessage="Label" />
          }
          error={invalidLabelError}
          isInvalid={isInvalidLabel}
          display="rowCompressed"
        >
          <EuiFieldText
            name="label"
            value={label}
            onChange={onLabelChange}
            isInvalid={isInvalidLabel}
            compressed
            data-test-subj="mlJobCustomUrlLabelInput"
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <FormattedMessage id="xpack.ml.customUrlsEditor.linkToLabel" defaultMessage="Link to" />
          }
          display="rowCompressed"
        >
          <EuiRadioGroup
            options={getLinkToOptions()}
            idSelected={type}
            onChange={onTypeChange}
            className="url-link-to-radio"
            data-test-subj="mlJobCustomUrlLinkToTypeInput"
          />
        </EuiFormRow>

        {type === URL_TYPE.KIBANA_DASHBOARD && (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.dashboardNameLabel"
                defaultMessage="Dashboard name"
              />
            }
            display="rowCompressed"
          >
            <EuiSelect
              options={dashboardOptions}
              value={kibanaSettings?.dashboardId}
              onChange={onDashboardChange}
              data-test-subj="mlJobCustomUrlDashboardNameInput"
              compressed
            />
          </EuiFormRow>
        )}

        {type === URL_TYPE.KIBANA_DISCOVER && (
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.dataViewLabel"
                defaultMessage="Data view"
              />
            }
            display="rowCompressed"
          >
            <EuiSelect
              options={dataViewOptions}
              value={kibanaSettings?.discoverIndexPatternId}
              onChange={onDiscoverIndexPatternChange}
              data-test-subj="mlJobCustomUrlDiscoverIndexPatternInput"
              compressed
            />
          </EuiFormRow>
        )}

        {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) &&
          entityOptions.length > 0 && (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.customUrlsEditor.queryEntitiesLabel"
                  defaultMessage="Query entities"
                />
              }
            >
              <EuiComboBox
                placeholder={i18n.translate('xpack.ml.customUrlsEditor.selectEntitiesPlaceholder', {
                  defaultMessage: 'Select entities',
                })}
                options={entityOptions}
                selectedOptions={selectedEntityOptions}
                onChange={onQueryEntitiesChange}
                isClearable={true}
                data-test-subj="mlJobCustomUrlQueryEntitiesInput"
              />
            </EuiFormRow>
          )}

        {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) && hasTimefield && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={
                    <EuiFlexGroup gutterSize={'none'} alignItems="center">
                      <EuiFlexItem grow={false}>
                        <FormattedMessage
                          id="xpack.ml.customUrlsEditor.timeRangeLabel"
                          defaultMessage="Time range"
                        />
                      </EuiFlexItem>
                      {showCustomTimeRangeSelector ? (
                        <EuiFlexItem grow={false}>
                          <EuiIconTip
                            content={i18n.translate('xpack.ml.customUrlsEditor.timeRangeTooltip', {
                              defaultMessage: 'If not set, time range defaults to global settings.',
                            })}
                            position="top"
                            type="iInCircle"
                          />
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                  }
                  className="url-time-range"
                  display="rowCompressed"
                >
                  {showCustomTimeRangeSelector ? (
                    <IntervalTimerangeSelector
                      disabled={customUrl?.customTimeRange !== undefined}
                      setAddIntervalTimerange={setAddIntervalTimerange}
                      addIntervalTimerange={addIntervalTimerange}
                    />
                  ) : (
                    <EuiSelect
                      options={timeRangeOptions}
                      value={timeRange.type}
                      onChange={onTimeRangeTypeChange}
                      data-test-subj="mlJobCustomUrlTimeRangeInput"
                      compressed
                    />
                  )}
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                {(showCustomTimeRangeSelector && addIntervalTimerange) ||
                (!showCustomTimeRangeSelector && timeRange.type === TIME_RANGE_TYPE.INTERVAL) ? (
                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.ml.customUrlsEditor.intervalLabel"
                        defaultMessage="Interval"
                      />
                    }
                    className="url-time-range"
                    error={invalidIntervalError}
                    isInvalid={isInvalidTimeRange}
                    display="rowCompressed"
                  >
                    <EuiFieldText
                      value={timeRange.interval}
                      onChange={onTimeRangeIntervalChange}
                      isInvalid={isInvalidTimeRange}
                      data-test-subj="mlJobCustomUrlTimeRangeIntervalInput"
                      compressed
                    />
                  </EuiFormRow>
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
            {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) &&
            showCustomTimeRangeSelector &&
            hasTimefield ? (
              <>
                <EuiSpacer />
                <CustomTimeRangePicker
                  disabled={addIntervalTimerange}
                  onCustomTimeRangeChange={onCustomTimeRangeChange}
                  customTimeRange={customUrl?.customTimeRange}
                />
              </>
            ) : null}
          </>
        )}

        {type === URL_TYPE.OTHER && (
          <EuiFormRow
            label={
              <FormattedMessage id="xpack.ml.customUrlsEditor.urlLabel" defaultMessage="URL" />
            }
            display="rowCompressed"
            fullWidth={true}
          >
            <EuiTextArea
              fullWidth={true}
              rows={2}
              value={otherUrlSettings?.urlValue}
              onChange={onOtherUrlValueChange}
              data-test-subj="mlJobCustomUrlOtherTypeUrlInput"
              compressed
            />
          </EuiFormRow>
        )}
      </EuiForm>
    </>
  );
};
