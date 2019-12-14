/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for the form for editing a custom URL.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import { isValidCustomUrlSettingsTimeRange } from '../../../jobs/components/custom_url_editor/utils';
import { isValidLabel } from '../../../util/custom_url_utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { TIME_RANGE_TYPE, URL_TYPE } from './constants';

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

export const CustomUrlEditor = injectI18n(
  class CustomUrlEditor extends Component {
    static propTypes = {
      customUrl: PropTypes.object,
      setEditCustomUrl: PropTypes.func.isRequired,
      savedCustomUrls: PropTypes.array.isRequired,
      dashboards: PropTypes.array.isRequired,
      indexPatterns: PropTypes.array.isRequired,
      queryEntityFieldNames: PropTypes.array.isRequired,
    };

    constructor(props) {
      super(props);
    }

    onLabelChange = e => {
      const { customUrl, setEditCustomUrl } = this.props;
      setEditCustomUrl({
        ...customUrl,
        label: e.target.value,
      });
    };

    onTypeChange = linkType => {
      const { customUrl, setEditCustomUrl } = this.props;
      setEditCustomUrl({
        ...customUrl,
        type: linkType,
      });
    };

    onDashboardChange = e => {
      const { customUrl, setEditCustomUrl } = this.props;
      const kibanaSettings = customUrl.kibanaSettings;
      setEditCustomUrl({
        ...customUrl,
        kibanaSettings: {
          ...kibanaSettings,
          dashboardId: e.target.value,
        },
      });
    };

    onDiscoverIndexPatternChange = e => {
      const { customUrl, setEditCustomUrl } = this.props;
      const kibanaSettings = customUrl.kibanaSettings;
      setEditCustomUrl({
        ...customUrl,
        kibanaSettings: {
          ...kibanaSettings,
          discoverIndexPatternId: e.target.value,
        },
      });
    };

    onQueryEntitiesChange = selectedOptions => {
      const { customUrl, setEditCustomUrl } = this.props;
      const selectedFieldNames = selectedOptions.map(option => option.label);

      const kibanaSettings = customUrl.kibanaSettings;
      setEditCustomUrl({
        ...customUrl,
        kibanaSettings: {
          ...kibanaSettings,
          queryFieldNames: selectedFieldNames,
        },
      });
    };

    onOtherUrlValueChange = e => {
      const { customUrl, setEditCustomUrl } = this.props;
      setEditCustomUrl({
        ...customUrl,
        otherUrlSettings: {
          urlValue: e.target.value,
        },
      });
    };

    onTimeRangeTypeChange = e => {
      const { customUrl, setEditCustomUrl } = this.props;
      const timeRange = customUrl.timeRange;
      setEditCustomUrl({
        ...customUrl,
        timeRange: {
          ...timeRange,
          type: e.target.value,
        },
      });
    };

    onTimeRangeIntervalChange = e => {
      const { customUrl, setEditCustomUrl } = this.props;
      const timeRange = customUrl.timeRange;
      setEditCustomUrl({
        ...customUrl,
        timeRange: {
          ...timeRange,
          interval: e.target.value,
        },
      });
    };

    render() {
      const {
        customUrl,
        savedCustomUrls,
        dashboards,
        indexPatterns,
        queryEntityFieldNames,
        intl,
      } = this.props;

      if (customUrl === undefined) {
        return;
      }

      const { label, type, timeRange, kibanaSettings, otherUrlSettings } = customUrl;

      const dashboardOptions = dashboards.map(dashboard => {
        return { value: dashboard.id, text: dashboard.title };
      });

      const indexPatternOptions = indexPatterns.map(indexPattern => {
        return { value: indexPattern.id, text: indexPattern.title };
      });

      const entityOptions = queryEntityFieldNames.map(fieldName => ({ label: fieldName }));
      let selectedEntityOptions = [];
      if (kibanaSettings !== undefined && kibanaSettings.queryFieldNames !== undefined) {
        const queryFieldNames = kibanaSettings.queryFieldNames;
        selectedEntityOptions = queryFieldNames.map(fieldName => ({ label: fieldName }));
      }

      const timeRangeOptions = Object.keys(TIME_RANGE_TYPE).map(timeRangeType => {
        return { value: TIME_RANGE_TYPE[timeRangeType], text: TIME_RANGE_TYPE[timeRangeType] };
      });

      const isInvalidLabel = !isValidLabel(label, savedCustomUrls);
      const invalidLabelError =
        isInvalidLabel === true
          ? [
              intl.formatMessage({
                id: 'xpack.ml.customUrlsEditor.invalidLabelErrorMessage',
                defaultMessage: 'A unique label must be supplied',
              }),
            ]
          : [];

      const isInvalidTimeRange = !isValidCustomUrlSettingsTimeRange(timeRange);
      const invalidIntervalError =
        isInvalidTimeRange === true
          ? [
              intl.formatMessage({
                id: 'xpack.ml.customUrlsList.invalidIntervalFormatErrorMessage',
                defaultMessage: 'Invalid interval format',
              }),
            ]
          : [];

      return (
        <React.Fragment>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.ml.customUrlsEditor.createNewCustomUrlTitle"
                defaultMessage="Create new custom URL"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiForm className="ml-edit-url-form">
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.customUrlsEditor.labelLabel"
                  defaultMessage="Label"
                />
              }
              className="url-label"
              error={invalidLabelError}
              isInvalid={isInvalidLabel}
              compressed
            >
              <EuiFieldText
                value={label}
                onChange={this.onLabelChange}
                isInvalid={isInvalidLabel}
                compressed
              />
            </EuiFormRow>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.ml.customUrlsEditor.linkToLabel"
                  defaultMessage="Link to"
                />
              }
              compressed
            >
              <EuiRadioGroup
                options={getLinkToOptions()}
                idSelected={type}
                onChange={this.onTypeChange}
                className="url-link-to-radio"
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
                compressed
              >
                <EuiSelect
                  options={dashboardOptions}
                  value={kibanaSettings.dashboardId}
                  onChange={this.onDashboardChange}
                  compressed
                />
              </EuiFormRow>
            )}

            {type === URL_TYPE.KIBANA_DISCOVER && (
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.customUrlsEditor.indexPatternLabel"
                    defaultMessage="Index pattern"
                  />
                }
                compressed
              >
                <EuiSelect
                  options={indexPatternOptions}
                  value={kibanaSettings.discoverIndexPatternId}
                  onChange={this.onDiscoverIndexPatternChange}
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
                    placeholder={intl.formatMessage({
                      id: 'xpack.ml.customUrlsEditor.selectEntitiesPlaceholder',
                      defaultMessage: 'Select entities',
                    })}
                    options={entityOptions}
                    selectedOptions={selectedEntityOptions}
                    onChange={this.onQueryEntitiesChange}
                    isClearable={true}
                  />
                </EuiFormRow>
              )}

            {(type === URL_TYPE.KIBANA_DASHBOARD || type === URL_TYPE.KIBANA_DISCOVER) && (
              <>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow
                      label={
                        <FormattedMessage
                          id="xpack.ml.customUrlsEditor.timeRangeLabel"
                          defaultMessage="Time range"
                        />
                      }
                      className="url-time-range"
                      compressed
                    >
                      <EuiSelect
                        options={timeRangeOptions}
                        value={timeRange.type}
                        onChange={this.onTimeRangeTypeChange}
                        compressed
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  {timeRange.type === TIME_RANGE_TYPE.INTERVAL && (
                    <EuiFlexItem>
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
                        compressed
                      >
                        <EuiFieldText
                          value={timeRange.interval}
                          onChange={this.onTimeRangeIntervalChange}
                          isInvalid={isInvalidTimeRange}
                          compressed
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </>
            )}

            {type === URL_TYPE.OTHER && (
              <EuiFormRow
                label={
                  <FormattedMessage id="xpack.ml.customUrlsEditor.urlLabel" defaultMessage="URL" />
                }
                compressed
                fullWidth={true}
              >
                <EuiTextArea
                  fullWidth={true}
                  rows={2}
                  value={otherUrlSettings.urlValue}
                  onChange={this.onOtherUrlValueChange}
                  compressed
                />
              </EuiFormRow>
            )}
          </EuiForm>
        </React.Fragment>
      );
    }
  }
);
