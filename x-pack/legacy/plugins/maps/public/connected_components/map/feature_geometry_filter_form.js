/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class FeatureGeometryFilterForm extends Component {

  state = {
  };

  _renderHeader() {
    return (
      <button
        className="euiContextMenuPanelTitle"
        type="button"
        onClick={this.props.onClose}
      >
        <span className="euiContextMenu__itemLayout">
          <EuiIcon
            type="arrowLeft"
            size="m"
            className="euiContextMenu__icon"
          />

          <span className="euiContextMenu__text">
            <FormattedMessage
              id="xpack.maps.tooltip.geometryFilterForm.viewProperties"
              defaultMessage="View propeties"
            />
          </span>
        </span>
      </button>
    );
  }

  _renderForm() {
    return null;
  }

  render() {
    return (
      <Fragment>
        {this._renderHeader()}
      </Fragment>
    );
  }

}

