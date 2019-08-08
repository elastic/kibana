/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import get from 'lodash/object/get';

import {
  EuiButtonEmpty,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPopover,
  EuiContextMenuPanel,
  EuiLink,
} from '@elastic/eui';

import { metricsDetailsUrl } from '../../../services';

import { FieldList } from '../../components';

import { FieldChooser, StepError } from './components';

const whiteListedMetricByFieldType = {
  numeric: {
    avg: true,
    max: true,
    min: true,
    sum: true,
    value_count: true,
  },

  date: {
    max: true,
    min: true,
    value_count: true,
  },
};

const checkWhiteListedMetricByFieldType = (fieldType, metricName) => {
  return !!get(whiteListedMetricByFieldType, [fieldType, metricName]);
};

// We use an IFFE to associate metricType configs with their
// associated field types. After processing each of these
// objects should have a fieldTypes: { date: true, numeric: true }
// like object.
const metricTypesConfig = (function () {
  return [
    {
      type: 'avg',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxAverageLabel"
          defaultMessage="Average"
        />
      ),
    },
    {
      type: 'max',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxMaxLabel"
          defaultMessage="Maximum"
        />
      ),
    },
    {
      type: 'min',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxMinLabel"
          defaultMessage="Minimum"
        />
      ),
    },
    {
      type: 'sum',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxSumLabel"
          defaultMessage="Sum"
        />
      ),
    },
    {
      type: 'value_count',
      label: (
        <FormattedMessage
          id="xpack.rollupJobs.create.stepMetrics.checkboxValueCountLabel"
          defaultMessage="Value count"
        />
      ),
    },
  ].map(config => {
    const fieldTypes = {};
    for (const [fieldType, metrics] of Object.entries(whiteListedMetricByFieldType)) {
      fieldTypes[fieldType] = !!metrics[config.type];
    }
    return {
      ...config,
      fieldTypes,
    };
  });
}());

export class StepMetricsUi extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    onFieldsChange: PropTypes.func.isRequired,
    fieldErrors: PropTypes.object.isRequired,
    areStepErrorsVisible: PropTypes.bool.isRequired,
    metricsFields: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      metricsPopoverOpen: false,
      listColumns: [],
      selectedMetricsMap: [],
    };
  }

  openMetricsPopover = () => {
    this.setState({
      metricsPopoverOpen: true,
    });
  };

  closeMetricsPopover = () => {
    this.setState({
      metricsPopoverOpen: false,
    });
  };

  renderMetricsSelectAllItems() {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    return metricTypesConfig.map(({ label, type: metricName, fieldTypes }, idx) => {
      let isIndeterminate = false;
      let checkedCount = 0;

      const applicableMetrics = metrics
        .filter(({ type }) => {
          return fieldTypes[type];
        });

      applicableMetrics
        .forEach(({ types }) => {
          const metricSelected = types.some(type => type === metricName);
          if (metricSelected && !isIndeterminate) {
            isIndeterminate = true;
          }
          if (metricSelected) {
            ++checkedCount;
          }
        });

      const isChecked = checkedCount === applicableMetrics.length;
      const disabled = !metrics.some(({ type: fieldType }) =>
        checkWhiteListedMetricByFieldType(fieldType, metricName)
      );
      return (
        <EuiFlexItem grow={false} key={`${idx}-select-all-flex-item`}>
          <EuiCheckbox
            id={`${idx}-select-all-checkbox`}
            data-test-subj={`rollupJobMetricsSelectAllCheckbox-${metricName}`}
            disabled={disabled}
            label={label}
            checked={!disabled && isChecked}
            indeterminate={!isChecked && isIndeterminate}
            onChange={() =>
              onFieldsChange({ metrics: this.setMetrics(metricName, !isChecked) })
            }
          />
        </EuiFlexItem>
      );
    });
  }

  getMetricsSelectAllMenu() {
    return (
      <EuiPopover
        id={'stepMetricsPopover'}
        isOpen={this.state.metricsPopoverOpen}
        closePopover={this.closeMetricsPopover}
        data-test-subj={'rollupJobMetricsSelectAll'}
        button={
          <EuiLink onClick={this.openMetricsPopover}>
            <b>{'Metrics'}</b>
          </EuiLink>
        }
      >
        <EuiContextMenuPanel>
          <EuiText size={'s'}>
            <EuiFlexGroup direction={'column'}>
              <EuiFlexItem>
                <b>{'Select All'}</b>
              </EuiFlexItem>
              {this.renderMetricsSelectAllItems()}
            </EuiFlexGroup>
          </EuiText>
        </EuiContextMenuPanel>
      </EuiPopover>
    );
  }

  getListColumns() {
    return StepMetricsUi.chooserColumns.concat({
      type: 'metrics',
      name: this.getMetricsSelectAllMenu(),
      render: ({ name: fieldName, type: fieldType, types }) => {
        const { onFieldsChange } = this.props;
        const checkboxes = metricTypesConfig
          .map(({ type, label }) => {
            const isAllowed = whiteListedMetricByFieldType[fieldType][type];

            if (!isAllowed) {
              return;
            }

            const isSelected = types.includes(type);

            return (
              <EuiFlexItem grow={false} key={`${fieldName}-${type}-checkbox`}>
                <EuiCheckbox
                  id={`${fieldName}-${type}-checkbox`}
                  data-test-subj={`rollupJobMetricsCheckbox-${type}`}
                  label={label}
                  checked={isSelected}
                  onChange={() =>
                    onFieldsChange({ metrics: this.setMetric(fieldName, type, !isSelected) })
                  }
                />
              </EuiFlexItem>
            );
          })
          .filter(checkbox => checkbox !== undefined);

        return (
          <EuiFlexGroup wrap gutterSize="m">
            {checkboxes}
          </EuiFlexGroup>
        );
      },
    });
  }

  onSelectField = field => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = metrics.concat({
      ...field,
      types: [],
    });

    onFieldsChange({ metrics: newMetrics });
  };

  onRemoveField = field => {
    const {
      fields: { metrics },
      onFieldsChange,
    } = this.props;

    const newMetrics = metrics.filter(({ name }) => name !== field.name);

    onFieldsChange({ metrics: newMetrics });
  };

  setMetrics(metricType, isSelected) {
    const {
      fields: { metrics },
    } = this.props;
    return metrics.reduce((acc, metric) => {
      return this.setMetric(metric.name, metricType, isSelected);
    }, []);
  }

  setMetric = (fieldName, metricType, isSelected) => {
    const {
      fields: { metrics },
    } = this.props;

    const newMetrics = [...metrics];
    const newMetric = newMetrics.find(({ name }) => name === fieldName);

    // Update copied object by reference
    if (isSelected) {
      // Don't add duplicates.
      if (newMetric.types.indexOf(metricType) === -1) {
        newMetric.types.push(metricType);
      }
    } else {
      newMetric.types.splice(newMetric.types.indexOf(metricType), 1);
    }
    return newMetrics;
  };

  render() {
    const { fields, metricsFields, onFieldsChange } = this.props;

    const { metrics } = fields;

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj="rollupJobCreateMetricsTitle">
              <h3>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetricsTitle"
                  defaultMessage="Metrics (optional)"
                />
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetricsDescription"
                  defaultMessage="Select the metrics to collect while rolling up data. By default,
                    only doc_counts are collected for each group."
                />
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false} className="rollupJobWizardStepActions">
            <EuiButtonEmpty
              size="s"
              flush="right"
              href={metricsDetailsUrl}
              target="_blank"
              iconType="help"
              data-test-subj="rollupJobCreateMetricsDocsButton"
            >
              <FormattedMessage
                id="xpack.rollupJobs.create.stepMetrics.readDocsButtonLabel"
                defaultMessage="Metrics docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <FieldList
          columns={this.getListColumns()}
          fields={metrics}
          onRemoveField={this.onRemoveField}
          emptyMessage={<p>No metrics fields added</p>}
          addActions={() => [
            {
              name: 'Select All',
              isPrimary: true,
              description: 'Select all of the metrics in this field.',
              icon: 'check',
              type: 'icon',
              color: 'success',
              onClick: ({ name: fieldName }) => {
                const newMetrics = metricTypesConfig.reduce((acc, { type }) => {
                  return this.setMetric(fieldName, type, true);
                }, null);
                onFieldsChange({metric: newMetrics});
              },
            }
          ]}
          addButton={
            <FieldChooser
              buttonLabel={
                <FormattedMessage
                  id="xpack.rollupJobs.create.stepMetrics.fieldsChooserLabel"
                  defaultMessage="Add metrics fields"
                />
              }
              columns={StepMetricsUi.chooserColumns}
              fields={metricsFields}
              selectedFields={metrics}
              onSelectField={this.onSelectField}
              dataTestSubj="rollupJobMetricsFieldChooser"
            />
          }
          dataTestSubj="rollupJobMetricsFieldList"
        />

        {this.renderErrors()}
      </Fragment>
    );
  }

  renderErrors = () => {
    const { areStepErrorsVisible, fieldErrors } = this.props;
    const { metrics: errorMetrics } = fieldErrors;

    // Hide the error if there are no errors, which can occur if the errors are visible
    // but the user then addresses all of them.
    if (!areStepErrorsVisible || !errorMetrics) {
      return null;
    }

    return <StepError title={errorMetrics} />;
  };

  static chooserColumns = [
    {
      field: 'name',
      name: 'Field',
      sortable: true,
      width: '240px',
    },
    {
      field: 'type',
      name: 'Type',
      truncateText: true,
      sortable: true,
      width: '100px',
    },
  ];
}

export const StepMetrics = injectI18n(StepMetricsUi);
