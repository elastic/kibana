/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { EuiSuperSelect, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { IconStops } from './icon_stops';
import { getIconPaletteOptions, PREFERRED_ICONS } from '../../symbol_utils';
import type {
  CustomIcon,
  IconDynamicOptions,
  IconStop,
} from '../../../../../../common/descriptor_types';
import { ICON_SOURCE } from '../../../../../../common/constants';
import type { IDynamicStyleProperty } from '../../properties/dynamic_style_property';

const CUSTOM_MAP_ID = 'CUSTOM_MAP_ID';

const DEFAULT_ICON_STOPS: IconStop[] = [
  { stop: null, icon: PREFERRED_ICONS[0], icon_source: ICON_SOURCE.MAKI }, // first stop is the "other" category
  { stop: '', icon: PREFERRED_ICONS[1], icon_source: ICON_SOURCE.MAKI },
];

export interface StyleOptionChanges {
  custom_icon_stops?: IconStop[];
  icon_palette_id?: string | null;
  use_custom_icon_map: boolean;
}

interface Props {
  custom_icon_stops?: IconStop[];
  icon_palette_id: string | null;
  customIcons: CustomIcon[];
  onCustomIconsChange: (customIcons: CustomIcon[]) => void;
  onChange: (changes: StyleOptionChanges) => void;
  styleProperty: IDynamicStyleProperty<IconDynamicOptions>;
  use_custom_icon_map?: boolean;
  isCustomOnly: boolean;
}

interface State {
  customIconStops: IconStop[];
}

export class IconMapSelect extends Component<Props, State> {
  state = {
    customIconStops: this.props.custom_icon_stops
      ? this.props.custom_icon_stops
      : DEFAULT_ICON_STOPS,
  };

  _onMapSelect = (selectedValue: string) => {
    const useCustomIconMap = selectedValue === CUSTOM_MAP_ID;
    const changes: StyleOptionChanges = {
      icon_palette_id: useCustomIconMap ? null : selectedValue,
      use_custom_icon_map: useCustomIconMap,
    };
    // edge case when custom palette is first enabled
    // customIconStops is undefined so need to update custom stops with default so icons are rendered.
    if (!this.props.custom_icon_stops) {
      changes.custom_icon_stops = DEFAULT_ICON_STOPS;
    }
    this.props.onChange(changes);
  };

  _onCustomMapChange = ({
    customStops,
    isInvalid,
  }: {
    customStops: IconStop[];
    isInvalid: boolean;
  }) => {
    // Manage invalid custom map in local state
    this.setState({ customIconStops: customStops });

    if (!isInvalid) {
      this.props.onChange({
        use_custom_icon_map: true,
        custom_icon_stops: customStops,
      });
    }
  };

  _renderCustomStopsInput() {
    return !this.props.isCustomOnly && !this.props.use_custom_icon_map ? null : (
      <IconStops
        field={this.props.styleProperty.getField()}
        getValueSuggestions={this.props.styleProperty.getValueSuggestions}
        iconStops={this.state.customIconStops}
        onChange={this._onCustomMapChange}
        onCustomIconsChange={this.props.onCustomIconsChange}
        customIcons={this.props.customIcons}
      />
    );
  }

  _renderMapSelect() {
    if (this.props.isCustomOnly) {
      return null;
    }

    const mapOptionsWithCustom = [
      {
        value: CUSTOM_MAP_ID,
        inputDisplay: i18n.translate('xpack.maps.styles.icon.customMapLabel', {
          defaultMessage: 'Custom icon palette',
        }),
      },
      ...getIconPaletteOptions(),
    ];

    let valueOfSelected = '';
    if (this.props.use_custom_icon_map) {
      valueOfSelected = CUSTOM_MAP_ID;
    } else if (this.props.icon_palette_id) {
      valueOfSelected = this.props.icon_palette_id;
    }

    return (
      <Fragment>
        <EuiSuperSelect
          options={mapOptionsWithCustom}
          onChange={this._onMapSelect}
          valueOfSelected={valueOfSelected}
          compressed
          aria-label={i18n.translate('xpack.maps.styles.icon.iconPaletteSelectAriaLabel', {
            defaultMessage: 'Icon palette',
          })}
        />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderMapSelect()}
        {this._renderCustomStopsInput()}
      </Fragment>
    );
  }
}
