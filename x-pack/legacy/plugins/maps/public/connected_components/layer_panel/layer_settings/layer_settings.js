/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiTitle,
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';

import { ValidatedRange } from '../../../components/validated_range';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ValidatedDualRange } from 'ui/validated_range';

const MIN_ZOOM = 0;
const MAX_ZOOM = 24;

export function LayerSettings(props) {
  const onLabelChange = event => {
    const label = event.target.value;
    props.updateLabel(props.layerId, label);
  };

  const onZoomChange = ([min, max]) => {
    props.updateMinZoom(props.layerId, Math.max(MIN_ZOOM, parseInt(min, 10)));
    props.updateMaxZoom(props.layerId, Math.min(MAX_ZOOM, parseInt(max, 10)));
  };

  const onAlphaChange = alpha => {
    props.updateAlpha(props.layerId, alpha);
  };

  const onApplyGlobalQueryChange = event => {
    props.setLayerApplyGlobalQuery(props.layerId, event.target.checked);
  };

  const renderZoomSliders = () => {
    return (
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoomLabel', {
          defaultMessage: 'Zoom range for layer visibility',
        })}
        formRowDisplay="rowCompressed"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        value={[props.minZoom, props.maxZoom]}
        showInput
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
      />
    );
  };

  const renderLabel = () => {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerNameLabel', {
          defaultMessage: 'Layer name',
        })}
        display="rowCompressed"
      >
        <EuiFieldText value={props.label} onChange={onLabelChange} compressed />
      </EuiFormRow>
    );
  };

  const renderAlphaSlider = () => {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerTransparencyLabel', {
          defaultMessage: 'Layer transparency',
        })}
        display="rowCompressed"
      >
        <ValidatedRange
          min={0.0}
          max={1.0}
          step={0.05}
          value={props.alpha}
          onChange={onAlphaChange}
          showLabels
          showInput
          showRange
          compressed
        />
      </EuiFormRow>
    );
  };

  const renderApplyGlobalQueryCheckbox = () => {
    const layerSupportsGlobalQuery = props.layer.getIndexPatternIds().length;

    const applyGlobalQueryCheckbox = (
      <EuiSwitch
        label={i18n.translate('xpack.maps.layerPanel.applyGlobalQueryCheckboxLabel', {
          defaultMessage: `Apply global filter to layer`,
        })}
        checked={layerSupportsGlobalQuery ? props.applyGlobalQuery : false}
        onChange={onApplyGlobalQueryChange}
        disabled={!layerSupportsGlobalQuery}
        data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
      />
    );

    if (layerSupportsGlobalQuery) {
      return applyGlobalQueryCheckbox;
    }

    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.maps.layerPanel.applyGlobalQueryCheckbox.disableTooltip', {
          defaultMessage: `Layer does not support filtering.`,
        })}
      >
        {applyGlobalQueryCheckbox}
      </EuiToolTip>
    );
  };

  return (
    <Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.layerSettingsTitle"
              defaultMessage="Layer settings"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />
        {renderLabel()}
        {renderZoomSliders()}
        {renderAlphaSlider()}

        <EuiSpacer size="m" />
        {renderApplyGlobalQueryCheckbox()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
