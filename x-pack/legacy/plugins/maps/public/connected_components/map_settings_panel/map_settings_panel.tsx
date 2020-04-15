/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSuperSelect, EuiTextColor, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MapSettings, MapStoreState } from '../../../../../../plugins/maps/public/reducers/map';

interface Props {
  cancelChanges: () => void;
  keepChanges: () => void;
  mapSettings: MapSettings;
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}

export function MapSettingsPanel({
  cancelChanges,
  keepChanges,
  mapSettings,
  updateMapSetting,
}: Props) {
  return <div>Map settings</div>;
}
