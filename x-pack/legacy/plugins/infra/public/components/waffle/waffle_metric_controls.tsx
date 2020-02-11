/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState, useCallback } from 'react';
import { IFieldType } from 'src/plugins/data/public';
import {
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
  SnapshotCustomMetricInputRT,
} from '../../../common/http_api/snapshot_api';
import { SnapshotMetricType, SnapshotMetricTypeRT } from '../../../common/inventory_models/types';
import { CustomMetricForm } from './custom_metric_form';
import { CustomMetricEntry, getCustomMetricLabel } from './custom_metric_entry';

interface Props {
  options: Array<{ text: string; value: string }>;
  metric: SnapshotMetricInput;
  fields: IFieldType[];
  onChange: (metric: SnapshotMetricInput) => void;
  onChangeCustomMetrics: (metrics: SnapshotCustomMetricInput[]) => void;
  customMetrics: SnapshotCustomMetricInput[];
}

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export const WaffleMetricControls = ({
  fields,
  onChange,
  onChangeCustomMetrics,
  metric,
  options,
  customMetrics,
}: Props) => {
  const [isPopoverOpen, setPopoverState] = useState<boolean>(false);

  const handleClose = useCallback(() => {
    setPopoverState(false);
  }, [setPopoverState]);

  const handleToggle = useCallback(() => {
    setPopoverState(!isPopoverOpen);
  }, [isPopoverOpen]);

  const handleClick = useCallback(
    (val: string) => {
      if (!SnapshotMetricTypeRT.is(val)) {
        const selectedMetric = customMetrics.find(m => m.id === val);
        if (selectedMetric) {
          onChange(selectedMetric);
        }
      } else {
        onChange({ type: val as SnapshotMetricType });
      }
      handleClose();
    },
    [customMetrics, handleClose, onChange]
  );

  const handleDelete = useCallback(
    (metricId: string) => {
      const newCustomMetrics = customMetrics.filter(m => m.id !== metricId);
      onChangeCustomMetrics(newCustomMetrics);
      if (SnapshotCustomMetricInputRT.is(metric) && metric.id === metricId) {
        handleClick(options[0].value);
      }
    },
    [customMetrics, handleClick, metric, onChangeCustomMetrics, options]
  );

  const handleCustomMetric = useCallback(
    (newMetric: SnapshotCustomMetricInput) => {
      onChangeCustomMetrics([...customMetrics, newMetric]);
      onChange(newMetric);
      setPopoverState(false);
    },
    [customMetrics, onChange, onChangeCustomMetrics]
  );

  if (!options.length || !metric.type) {
    throw Error(
      i18n.translate('xpack.infra.waffle.unableToSelectMetricErrorTitle', {
        defaultMessage: 'Unable to select options or value for metric.',
      })
    );
  }

  const id = SnapshotCustomMetricInputRT.is(metric) && metric.id ? metric.id : metric.type;

  const currentLabel = SnapshotCustomMetricInputRT.is(metric)
    ? getCustomMetricLabel(metric)
    : options.find(o => o.value === id)?.text;

  if (!currentLabel) {
    return null;
  }

  const customMetricTitle = i18n.translate('xpack.waffle.customMetricPanelLabel', {
    defaultMessage: 'Add custom metric',
  });

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: '',
      items: [
        ...options.map(o => {
          const icon = o.value === id ? 'check' : 'empty';
          const panel = { name: o.text, onClick: () => handleClick(o.value), icon };
          return panel;
        }),
        ...customMetrics.map(m => {
          const icon = m.id === id ? 'check' : 'empty';
          const panel = {
            name: getCustomMetricLabel(m),
            onClick: () => handleClick(m.id),
            icon,
          };
          return panel;
        }),
        { icon: 'plusInCircle', name: customMetricTitle, panel: 'customMetricPanel' },
      ],
    },
    {
      id: 'customMetricPanel',
      title: customMetricTitle,
      width: 685,
      content: (
        <CustomMetricForm
          onChange={handleCustomMetric}
          fields={fields}
          customMetrics={customMetrics}
        />
      ),
    },
  ];

  const button = (
    <EuiFilterButton iconType="arrowDown" onClick={handleToggle}>
      <FormattedMessage
        id="xpack.infra.waffle.metricButtonLabel"
        defaultMessage="Metric: {selectedMetric}"
        values={{ selectedMetric: currentLabel }}
      />
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        isOpen={isPopoverOpen}
        id="metricsPanel"
        button={button}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        closePopover={handleClose}
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </EuiFilterGroup>
  );
};
