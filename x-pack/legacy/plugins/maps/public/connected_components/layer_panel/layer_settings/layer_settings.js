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
    const alphaDecimal = alpha / 100;

    props.updateAlpha(props.layerId, alphaDecimal);
  };

  const onApplyGlobalQueryChange = event => {
    props.setLayerApplyGlobalQuery(props.layerId, event.target.checked);
  };

  const renderZoomSliders = () => {
    return (
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoomLabel', {
          defaultMessage: 'Visibility',
        })}
        formRowDisplay="columnCompressed"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        value={[props.minZoom, props.maxZoom]}
        showInput="inputWithPopover"
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
        prepend={i18n.translate('xpack.maps.layerPanel.settingsPanel.visibleZoom', {
          defaultMessage: 'Zoom levels',
        })}
      />
    );
  };

  const renderLabel = () => {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerNameLabel', {
          defaultMessage: 'Name',
        })}
        display="columnCompressed"
      >
        <EuiFieldText value={props.label} onChange={onLabelChange} compressed />
      </EuiFormRow>
    );
  };

  const renderAlphaSlider = () => {
    const alphaPercent = Math.round(props.alpha * 100);

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerTransparencyLabel', {
          defaultMessage: 'Opacity',
        })}
        display="columnCompressed"
      >
        <ValidatedRange
          min={0}
          max={100}
          step={1}
          value={alphaPercent}
          onChange={onAlphaChange}
          showInput
          showRange
          compressed
          append={i18n.translate('xpack.maps.layerPanel.settingsPanel.percentageLabel', {
            defaultMessage: '%',
            description: 'Percentage',
          })}
        />
      </EuiFormRow>
    );
  };

  const renderApplyGlobalQueryCheckbox = () => {
    const layerSupportsGlobalQuery = props.layer.getIndexPatternIds().length;

    const applyGlobalQueryCheckbox = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.layerPanel.settingsPanel.layerGlobalFilterLabel', {
          defaultMessage: 'Global filter',
        })}
        display="columnCompressedSwitch"
      >
        <EuiSwitch
          label={i18n.translate('xpack.maps.layerPanel.applyGlobalQueryCheckboxLabel', {
            defaultMessage: `Apply to layer`,
          })}
          checked={layerSupportsGlobalQuery ? props.applyGlobalQuery : false}
          onChange={onApplyGlobalQueryChange}
          disabled={!layerSupportsGlobalQuery}
          data-test-subj="mapLayerPanelApplyGlobalQueryCheckbox"
          compressed
        />
      </EuiFormRow>
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
        {renderApplyGlobalQueryCheckbox()}
      </EuiPanel>

      <EuiSpacer size="s" />
    </Fragment>
  );
}
