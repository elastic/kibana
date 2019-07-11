/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { InjectedIntl, injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiRadioGroup,
  EuiButtonEmpty,
  EuiPopover,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import {
  MetricsExplorerChartOptions as ChartOptions,
  MetricsExplorerYAxisMode,
  MetricsExplorerChartType,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';

interface Props {
  chartOptions: ChartOptions;
  onChange: (options: ChartOptions) => void;
  intl: InjectedIntl;
}

export const MetricsExplorerChartOptions = injectI18n(({ chartOptions, onChange, intl }: Props) => {
  const [isPopoverOpen, setPopoverState] = useState<boolean>(false);

  const handleClosePopover = useCallback(() => {
    setPopoverState(false);
  }, []);

  const handleOpenPopover = useCallback(() => {
    setPopoverState(true);
  }, []);

  const button = (
    <EuiButtonEmpty iconSide="left" iconType="eye" onClick={handleOpenPopover}>
      <FormattedMessage
        id="xpack.infra.metricsExplorer.customizeChartOptions"
        defaultMessage="Customize"
      />
    </EuiButtonEmpty>
  );

  const yAxisRadios = [
    {
      id: MetricsExplorerYAxisMode.auto,
      label: intl.formatMessage({
        id: 'xpack.infra.metricsExplorer.chartOptions.autoLabel',
        defaultMessage: 'Automatic (Min to Max)',
      }),
    },
    {
      id: MetricsExplorerYAxisMode.fromZero,
      label: intl.formatMessage({
        id: 'xpack.infra.metricsExplorer.chartOptions.fromZeroLabel',
        defaultMessage: 'From Zero (0 to Max',
      }),
    },
  ];

  const typeRadios = [
    {
      id: MetricsExplorerChartType.line,
      label: intl.formatMessage({
        id: 'xpack.infra.metricsExplorer.chartOptions.lineLabel',
        defaultMessage: 'Line',
      }),
    },
    {
      id: MetricsExplorerChartType.area,
      label: intl.formatMessage({
        id: 'xpack.infra.metricsExplorer.chartOptions.areaLabel',
        defaultMessage: 'Area',
      }),
    },
  ];

  const handleYAxisChange = useCallback(
    (id: string) => {
      onChange({
        ...chartOptions,
        yAxisMode: id as MetricsExplorerYAxisMode,
      });
    },
    [chartOptions, onChange]
  );

  const handleTypeChange = useCallback(
    (id: string) => {
      onChange({
        ...chartOptions,
        type: id as MetricsExplorerChartType,
      });
    },
    [chartOptions, onChange]
  );

  const handleStackChange = useCallback(
    e => {
      onChange({
        ...chartOptions,
        stack: e.target.checked,
      });
    },
    [chartOptions, onChange]
  );

  return (
    <EuiPopover
      id="MetricExplorerChartOptionsPopover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={handleClosePopover}
    >
      <EuiForm>
        <EuiFormRow
          compressed
          label={intl.formatMessage({
            id: 'xpack.infra.metricsExplorer.chartOptions.typeLabel',
            defaultMessage: 'Chart Style',
          })}
        >
          <EuiRadioGroup
            options={typeRadios}
            idSelected={chartOptions.type}
            onChange={handleTypeChange}
          />
        </EuiFormRow>
        <EuiFormRow
          compressed
          label={intl.formatMessage({
            id: 'xpack.infra.metricsExplorer.chartOptions.yAxisDomainLabel',
            defaultMessage: 'Y Axis Domain',
          })}
        >
          <EuiRadioGroup
            options={yAxisRadios}
            idSelected={chartOptions.yAxisMode}
            onChange={handleYAxisChange}
          />
        </EuiFormRow>
        <EuiFormRow
          compressed
          label={intl.formatMessage({
            id: 'xpack.infra.metricsExplorer.chartOptions.stackLabel',
            defaultMessage: 'Stack Series',
          })}
        >
          <EuiSwitch
            label={intl.formatMessage({
              id: 'xpack.infra.metricsExplorer.chartOptions.stackSwitchLabel',
              defaultMessage: 'Stack',
            })}
            checked={chartOptions.stack}
            onChange={handleStackChange}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
});
