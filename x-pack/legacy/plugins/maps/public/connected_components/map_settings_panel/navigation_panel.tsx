/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { MapSettings, MapStoreState } from '../../../../../../plugins/maps/public/reducers/map';
import { ValidatedDualRange } from '../../../../../../../src/plugins/kibana_react/public';
import { MAX_ZOOM, MIN_ZOOM } from '../../../common/constants';

interface Props {
  mapSettings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}

export function NavigationPanel({ mapSettings, updateMapSetting }: Props) {
  const onZoomChange = ([min, max]) => {
    updateMapSetting('minZoom', Math.max(MIN_ZOOM, parseInt(min, 10)));
    updateMapSetting('maxZoom', Math.min(MAX_ZOOM, parseInt(max, 10)));
  };

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="xpack.maps.mapSettingsPanel.navigationTitle"
            defaultMessage="Navigation"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="m" />
      <ValidatedDualRange
        label={i18n.translate('xpack.maps.mapSettingsPanel.zoomRangeLabel', {
          defaultMessage: 'Zoom range',
        })}
        formRowDisplay="columnCompressed"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        value={[mapSettings.minZoom, mapSettings.maxZoom]}
        showInput="inputWithPopover"
        showRange
        showLabels
        onChange={onZoomChange}
        allowEmptyRange={false}
        compressed
      />
    </EuiPanel>
  );
}
