/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';

import {
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { FieldHistogram } from './field_histogram';

export class FieldRangeInput extends Component {
  state = {
    isLoadingMeta: false,
    errorLoadingMeta: false,
    histogramData: null,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this._cancelFieldMetaLoad) {
      this._cancelFieldMetaLoad();
    }
  }

  _loadFieldMeta = async () => {
    this.setState({
      isLoadingMeta: true,
      errorLoadingMeta: false
    });

    let fieldMeta;
    try {
      const { cancel, resultsPromise } = this.props.loadFieldMeta(this.props.field);
      this._cancelFieldMetaLoad = cancel;
      fieldMeta = await resultsPromise;
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          isLoadingMeta: false,
          errorLoadingMeta: true
        });
        this._cancelFieldMetaLoad = null;
      }
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      isLoadingMeta: false,
      errorLoadingMeta: true,
      histogramData: fieldMeta.histogram
    });

    this.props.onMinChange(fieldMeta.min);
    this.props.onMaxChange(fieldMeta.max);
  }

  _onMinChange = e => {
    const sanitizedValue = parseFloat(e.target.value);
    this.props.onMinChange(isNaN(sanitizedValue) ? '' : sanitizedValue);
  };

  _onMaxChange = e => {
    const sanitizedValue = parseFloat(e.target.value);
    this.props.onMaxChange(isNaN(sanitizedValue) ? '' : sanitizedValue);
  };

  renderLoadFieldMetaButton() {
    if (!this.props.loadFieldMeta) {
      return null;
    }

    if (!this.props.field) {
      return (
        <EuiText>
          <p>
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.maps.style.fieldRange.setFieldMessage"
                defaultMessage="Select a field to load range."
              />
            </EuiTextColor>
          </p>
        </EuiText>
      );
    }

    return (
      <EuiButtonEmpty
        onClick={this._loadFieldMeta}
        isLoading={this.state.isLoadingMeta}
      >
        <FormattedMessage
          id="xpack.maps.style.fieldRange.loadFieldMetaButtonLabel"
          defaultMessage="Load range"
        />
      </EuiButtonEmpty>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiFieldNumber
          placeholder={i18n.translate('xpack.maps.style.fieldRange.minLabel', {
            defaultMessage: 'min'
          })}
          value={this.props.min}
          onChange={this._onMinChange}
        />
        <EuiFieldNumber
          placeholder={i18n.translate('xpack.maps.style.fieldRange.maxLabel', {
            defaultMessage: 'max'
          })}
          value={this.props.max}
          onChange={this._onMaxChange}
        />
        <FieldHistogram
          data={this.state.histogramData}
        />
        {this.renderLoadFieldMetaButton()}
      </Fragment>
    );
  }
}
