/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFormRow, EuiPanel, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MapSettings } from '../../../common/descriptor_types';
import { AlphaSlider } from '../../components/alpha_slider';
import { MbValidatedColorPicker } from '../../classes/styles/vector/components/color/mb_validated_color_picker';

interface Props {
  settings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}

export function SpatialFiltersPanel({ settings, updateMapSetting }: Props) {
  const onAlphaChange = (alpha: number) => {
    updateMapSetting('spatial_filters_alpa', alpha);
  };

  const onFillColorChange = (color: string) => {
    updateMapSetting('spatial_filters_fill_color', color);
  };

  const onLineColorChange = (color: string) => {
    updateMapSetting('spatial_filters_line_color', color);
  };

  const onShowSpatialFiltersChange = (event: EuiSwitchEvent) => {
    updateMapSetting('show_spatial_filters', event.target.checked);
  };

  const renderStyleInputs = () => {
    if (!settings.show_spatial_filters) {
      return null;
    }

    return (
      <>
        <AlphaSlider alpha={settings.spatial_filters_alpa} onChange={onAlphaChange} />

        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.spatialFiltersFillColorLabel', {
            defaultMessage: 'Fill color',
          })}
          display="columnCompressed"
        >
          <MbValidatedColorPicker
            color={settings.spatial_filters_fill_color}
            onChange={onFillColorChange}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.mapSettingsPanel.spatialFiltersLineColorLabel', {
            defaultMessage: 'Border color',
          })}
          display="columnCompressed"
        >
          <MbValidatedColorPicker
            color={settings.spatial_filters_line_color}
            onChange={onLineColorChange}
          />
        </EuiFormRow>
      </>
    );
  };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.maps.mapSettingsPanel.spatialFiltersTitle"
            defaultMessage="Spatial filters"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.maps.mapSettingsPanel.showSpatialFiltersLabel', {
            defaultMessage: 'Show spatial filters on map',
          })}
          checked={settings.show_spatial_filters}
          onChange={onShowSpatialFiltersChange}
          compressed
        />
      </EuiFormRow>
      {renderStyleInputs()}
    </EuiPanel>
  );
}
