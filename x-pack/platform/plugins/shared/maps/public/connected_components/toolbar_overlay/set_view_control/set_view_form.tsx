/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiRadioGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapCenter, MapSettings } from '../../../../common/descriptor_types';
import { DecimalDegreesForm } from './decimal_degrees_form';
import { MgrsForm } from './mgrs_form';
import { UtmForm } from './utm_form';

const DEGREES_DECIMAL = 'dd';
const MGRS = 'mgrs';
const UTM = 'utm';

const COORDINATE_SYSTEM_OPTIONS = [
  {
    id: DEGREES_DECIMAL,
    label: i18n.translate('xpack.maps.setViewControl.decimalDegreesLabel', {
      defaultMessage: 'Decimal degrees',
    }),
  },
  {
    id: UTM,
    label: 'UTM',
  },
  {
    id: MGRS,
    label: 'MGRS',
  },
];

interface Props {
  settings: MapSettings;
  zoom: number;
  center: MapCenter;
  onSubmit: (lat: number, lon: number, zoom: number) => void;
}

interface State {
  isPopoverOpen: boolean;
  coordinateSystem: string;
}

export class SetViewForm extends Component<Props, State> {
  state: State = {
    coordinateSystem: DEGREES_DECIMAL,
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onCoordinateSystemChange = (optionId: string) => {
    this._closePopover();
    this.setState({
      coordinateSystem: optionId,
    });
  };

  _renderForm() {
    if (this.state.coordinateSystem === MGRS) {
      return (
        <MgrsForm
          settings={this.props.settings}
          zoom={this.props.zoom}
          center={this.props.center}
          onSubmit={this.props.onSubmit}
        />
      );
    }

    if (this.state.coordinateSystem === UTM) {
      return (
        <UtmForm
          settings={this.props.settings}
          zoom={this.props.zoom}
          center={this.props.center}
          onSubmit={this.props.onSubmit}
        />
      );
    }

    return (
      <DecimalDegreesForm
        settings={this.props.settings}
        zoom={this.props.zoom}
        center={this.props.center}
        onSubmit={this.props.onSubmit}
      />
    );
  }

  render() {
    return (
      <div data-test-subj="mapSetViewForm" style={{ width: 240 }}>
        <EuiPopover
          panelPaddingSize="s"
          isOpen={this.state.isPopoverOpen}
          closePopover={this._closePopover}
          button={
            <EuiButtonEmpty iconType="controlsHorizontal" size="xs" onClick={this._togglePopover}>
              <FormattedMessage
                id="xpack.maps.setViewControl.changeCoordinateSystemButtonLabel"
                defaultMessage="Coordinate system"
              />
            </EuiButtonEmpty>
          }
        >
          <EuiRadioGroup
            options={COORDINATE_SYSTEM_OPTIONS}
            idSelected={this.state.coordinateSystem}
            onChange={this._onCoordinateSystemChange}
          />
        </EuiPopover>
        {this._renderForm()}
      </div>
    );
  }
}
