/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import type { ChangeEvent } from 'react';
import React, { Fragment, Component } from 'react';
import { EuiFieldText, EuiFormRow, EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import type { Value } from '@kbn/kibana-react-plugin/public';
import { ValidatedDualRange } from '@kbn/kibana-react-plugin/public';
import { MAX_ZOOM, MIN_ZOOM } from '../../../../common/constants';
import { MVTFieldConfigEditor } from './mvt_field_config_editor';
import type { MVTFieldDescriptor } from '../../../../common/descriptor_types';

export type MVTSettings = {
  layerName: string;
  fields: MVTFieldDescriptor[];
  minSourceZoom: number;
  maxSourceZoom: number;
};

interface State {
  currentLayerName: string;
  currentMinSourceZoom: number;
  currentMaxSourceZoom: number;
  currentFields: MVTFieldDescriptor[];
  touchedLayerName: boolean;
}

interface Props {
  handleChange: (args: MVTSettings) => void;
  layerName: string;
  fields: MVTFieldDescriptor[];
  minSourceZoom: number;
  maxSourceZoom: number;
  showFields: boolean;
}

export class MVTSingleLayerSourceSettings extends Component<Props, State> {
  // Tracking in state to allow for debounce.
  // Changes to layer-name and/or min/max zoom require heavy operation at map-level (removing and re-adding all sources/layers)
  // To preserve snappyness of typing, debounce the dispatches.
  state = {
    currentLayerName: this.props.layerName,
    currentMinSourceZoom: this.props.minSourceZoom,
    currentMaxSourceZoom: this.props.maxSourceZoom,
    currentFields: _.cloneDeep(this.props.fields),
    touchedLayerName: false,
  };

  _handleChange = _.debounce(() => {
    this.props.handleChange({
      layerName: this.state.currentLayerName,
      minSourceZoom: this.state.currentMinSourceZoom,
      maxSourceZoom: this.state.currentMaxSourceZoom,
      fields: this.state.currentFields,
    });
  }, 200);

  _handleLayerNameInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ currentLayerName: e.target.value }, this._handleChange);
  };

  _handleLayerNameInputBlur = () => {
    this.setState({ touchedLayerName: true });
  };

  _handleFieldChange = (fields: MVTFieldDescriptor[]) => {
    this.setState({ currentFields: fields }, this._handleChange);
  };

  _handleZoomRangeChange = (e: Value) => {
    this.setState(
      {
        currentMinSourceZoom: parseInt(e[0] as string, 10),
        currentMaxSourceZoom: parseInt(e[1] as string, 10),
      },
      this._handleChange
    );
  };

  render() {
    const isInvalidLayerName = this.state.currentLayerName === '' && this.state.touchedLayerName;
    const layerNameErrorMessage = i18n.translate(
      'xpack.maps.source.MVTSingleLayerVectorSourceEditor.layerNameErrorMessage',
      {
        defaultMessage: 'Source layer is required',
      }
    );
    const preMessage = i18n.translate(
      'xpack.maps.source.MVTSingleLayerVectorSourceEditor.fieldsPreHelpMessage',
      {
        defaultMessage: 'Fields which are available in ',
      }
    );
    const message = (
      <>
        <b>{this.state.currentLayerName}</b>.{' '}
      </>
    );
    const postMessage = i18n.translate(
      'xpack.maps.source.MVTSingleLayerVectorSourceEditor.fieldsPostHelpMessage',
      {
        defaultMessage: 'These can be used for tooltips and dynamic styling.',
      }
    );
    const fieldEditor =
      this.props.showFields && this.state.currentLayerName !== '' ? (
        <EuiFormRow
          label={
            <span>
              {i18n.translate('xpack.maps.source.MVTSingleLayerVectorSourceEditor.fieldsMessage', {
                defaultMessage: 'Fields',
              })}{' '}
              <EuiIconTip
                type="question"
                color="subdued"
                content={
                  <>
                    {preMessage}
                    {message}
                    {postMessage}
                  </>
                }
              />
            </span>
          }
        >
          <MVTFieldConfigEditor
            fields={this.state.currentFields.slice()}
            onChange={this._handleFieldChange}
          />
        </EuiFormRow>
      ) : null;

    return (
      <Fragment>
        <EuiFormRow
          display="columnCompressed"
          label={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.layerNameMessage',
            {
              defaultMessage: 'Source layer',
            }
          )}
          isInvalid={isInvalidLayerName}
          error={isInvalidLayerName ? layerNameErrorMessage : undefined}
        >
          <EuiFieldText
            value={this.state.currentLayerName}
            onChange={this._handleLayerNameInputChange}
            onBlur={this._handleLayerNameInputBlur}
            isInvalid={isInvalidLayerName}
            compressed
          />
        </EuiFormRow>

        <ValidatedDualRange
          label={
            <span>
              {i18n.translate(
                'xpack.maps.source.MVTSingleLayerVectorSourceEditor.zoomRangeTopMessage',
                {
                  defaultMessage: 'Available levels',
                }
              )}{' '}
              <EuiIconTip
                type="question"
                color="subdued"
                content={i18n.translate(
                  'xpack.maps.source.MVTSingleLayerVectorSourceEditor.zoomRangeHelpMessage',
                  {
                    defaultMessage:
                      'Zoom levels where the layer is present in the tiles. This does not correspond directly to visibility. Layer data from lower levels can always be displayed at higher zoom levels (but not vice versa).',
                  }
                )}
              />
            </span>
          }
          formRowDisplay="columnCompressed"
          value={[this.state.currentMinSourceZoom, this.state.currentMaxSourceZoom]}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          onChange={this._handleZoomRangeChange}
          allowEmptyRange={false}
          showInput="inputWithPopover"
          compressed
          showLabels
          prepend={i18n.translate(
            'xpack.maps.source.MVTSingleLayerVectorSourceEditor.dataZoomRangeMessage',
            {
              defaultMessage: 'Zoom',
            }
          )}
        />
        {fieldEditor}
      </Fragment>
    );
  }
}
