/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NavigationPanel } from './navigation_panel';
import { SpatialFiltersPanel } from './spatial_filters_panel';
import { DisplayPanel } from './display_panel';
import { CustomIconsPanel } from './custom_icons_panel';
import type { CustomIcon, MapCenter, MapSettings } from '../../../common/descriptor_types';
import { panelStrings } from '../panel_strings';

export interface Props {
  cancelChanges: () => void;
  center: MapCenter;
  hasMapSettingsChanges: boolean;
  keepChanges: () => void;
  settings: MapSettings;
  customIcons: CustomIcon[];
  updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => void;
  updateCustomIcons: (customIcons: CustomIcon[]) => void;
  deleteCustomIcon: (symbolId: string) => void;
  zoom: number;
}

export function MapSettingsPanel({
  cancelChanges,
  center,
  hasMapSettingsChanges,
  keepChanges,
  settings,
  customIcons,
  updateMapSetting,
  updateCustomIcons,
  deleteCustomIcon,
  zoom,
}: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlyoutHeader hasBorder className="mapLayerPanel__header">
        <EuiTitle size="s">
          <h2>
            <FormattedMessage id="xpack.maps.mapSettingsPanel.title" defaultMessage="Settings" />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <div className="mapLayerPanel__body">
        <div className="mapLayerPanel__bodyOverflow">
          <CustomIconsPanel
            customIcons={customIcons}
            updateCustomIcons={updateCustomIcons}
            deleteCustomIcon={deleteCustomIcon}
          />
          <EuiSpacer size="s" />
          <DisplayPanel settings={settings} updateMapSetting={updateMapSetting} />
          <EuiSpacer size="s" />
          <NavigationPanel
            center={center}
            settings={settings}
            updateMapSetting={updateMapSetting}
            zoom={zoom}
          />
          <EuiSpacer size="s" />
          <SpatialFiltersPanel settings={settings} updateMapSetting={updateMapSetting} />
        </div>
      </div>

      <EuiFlyoutFooter className="mapLayerPanel__footer">
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={cancelChanges}
              flush="left"
              data-test-subj="layerPanelCancelButton"
            >
              {hasMapSettingsChanges ? panelStrings.discardChanges : panelStrings.close}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              disabled={!hasMapSettingsChanges}
              iconType="check"
              onClick={keepChanges}
              fill
              data-test-subj="mapSettingSubmitButton"
            >
              {panelStrings.keepChanges}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlexGroup>
  );
}
