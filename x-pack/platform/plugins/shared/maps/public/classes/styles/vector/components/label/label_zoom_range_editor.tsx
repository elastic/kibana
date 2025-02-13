/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow, EuiSwitch, EuiSwitchEvent, EuiToolTip } from '@elastic/eui';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { LabelZoomRangeStylePropertyDescriptor } from '../../../../../../common/descriptor_types';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { getVectorStyleLabel, getDisabledByMessage } from '../get_vector_style_label';
import { LabelZoomRangeProperty } from '../../properties/label_zoom_range_property';

interface Props {
  disabled: boolean;
  disabledBy: VECTOR_STYLES;
  handlePropertyChange: (
    propertyName: VECTOR_STYLES,
    stylePropertyDescriptor: LabelZoomRangeStylePropertyDescriptor
  ) => void;
  styleProperty: LabelZoomRangeProperty;
}

export function LabelZoomRangeEditor(props: Props) {
  const layerZoomRange = props.styleProperty.getLayerZoomRange();
  const labelZoomRange = props.styleProperty.getLabelZoomRange();

  const onSwitchChange = (event: EuiSwitchEvent) => {
    props.handlePropertyChange(props.styleProperty.getStyleName(), {
      options: {
        ...props.styleProperty.getOptions(),
        useLayerZoomRange: event.target.checked,
      },
    });
  };

  const onZoomChange = (value: [string, string]) => {
    props.handlePropertyChange(props.styleProperty.getStyleName(), {
      options: {
        ...props.styleProperty.getOptions(),
        minZoom: Math.max(layerZoomRange.minZoom, parseInt(value[0], 10)),
        maxZoom: Math.min(layerZoomRange.maxZoom, parseInt(value[1], 10)),
      },
    });
  };

  const { useLayerZoomRange } = props.styleProperty.getOptions();
  const slider = useLayerZoomRange ? null : (
    <EuiFormRow hasEmptyLabelSpace={true}>
      <ValidatedDualRange
        formRowDisplay="columnCompressed"
        min={layerZoomRange.minZoom}
        max={layerZoomRange.maxZoom}
        value={[labelZoomRange.minZoom, labelZoomRange.maxZoom]}
        showInput="inputWithPopover"
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
        prepend={i18n.translate('xpack.maps.styles.labelZoomRange.visibleZoom', {
          defaultMessage: 'Zoom levels',
        })}
      />
    </EuiFormRow>
  );

  const form = (
    <EuiForm>
      <EuiFormRow label={getVectorStyleLabel(props.styleProperty.getStyleName())}>
        <EuiSwitch
          label={i18n.translate('xpack.maps.styles.labelZoomRange.useLayerZoomLabel', {
            defaultMessage: 'Use layer visibility',
          })}
          checked={useLayerZoomRange}
          onChange={onSwitchChange}
          compressed
        />
      </EuiFormRow>
      {slider}
    </EuiForm>
  );

  if (!props.disabled) {
    return form;
  }

  return (
    <EuiToolTip
      anchorClassName="mapStyleFormDisabledTooltip"
      content={getDisabledByMessage(props.disabledBy)}
    >
      {form}
    </EuiToolTip>
  );
}
