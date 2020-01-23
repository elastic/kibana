/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { StyleMapSelect } from '../style_map_select';
import { i18n } from '@kbn/i18n';
import { getIconPaletteOptions } from '../../symbol_utils';
import { IconStops } from './icon_stops';

export function IconMapSelect({
  customIconStops,
  iconPaletteId,
  isDarkMode,
  onChange,
  symbolOptions,
  useCustomIconMap,
}) {
  function onMapSelectChange({ customMapStops, selectedMapId, useCustomMap }) {
    onChange({
      customIconStops: customMapStops,
      iconPaletteId: selectedMapId,
      useCustomIconMap: useCustomMap,
    });
  }

  function renderCustomIconStopsInput(onCustomMapChange) {
    return (
      <IconStops
        iconStops={customIconStops}
        isDarkMode={isDarkMode}
        onChange={onCustomMapChange}
        symbolOptions={symbolOptions}
      />
    );
  }

  return (
    <StyleMapSelect
      onChange={onMapSelectChange}
      customOptionLabel={i18n.translate('xpack.maps.styles.icon.customMapLabel', {
        defaultMessage: 'Custom icon palette',
      })}
      options={getIconPaletteOptions(isDarkMode)}
      customMapStops={customIconStops}
      useCustomMap={useCustomIconMap}
      selectedMapId={iconPaletteId}
      renderCustomStopsInput={renderCustomIconStopsInput}
    />
  );
}
