/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';

import { SingleFieldSelect } from '../../../components/single_field_select';
import { indexPatternService } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiFormRow,
  EuiCallOut,
} from '@elastic/eui';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';

import { npStart } from 'ui/new_platform';
const { IndexPatternSelect } = npStart.plugins.data.ui;
const GEO_FIELD_TYPES = [ES_GEO_FIELD_TYPE.GEO_POINT];

function filterGeoField({ type }) {
  return GEO_FIELD_TYPES.includes(type);
}

export class CreateSourceEditor extends Component {

  static propTypes = {
    onSourceConfigChange: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    indexPattern: undefined,
    indexPatternId: undefined,
    sourceGeoField: undefined,
    destGeoField: undefined,
    indexPatternHasMultipleGeoFields: false,
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  onIndexPatternSelect = (indexPatternId) => {
    this.setState({
      indexPatternId,
    }, this.loadIndexPattern.bind(null, indexPatternId));
  };

  loadIndexPattern = (indexPatternId) => {
    this.setState({
      isLoadingIndexPattern: true,
      indexPattern: undefined,
      sourceGeoField: undefined,
      destGeoField: undefined,
      indexPatternHasMultipleGeoFields: false,
    }, this.debouncedLoad.bind(null, indexPatternId));
  };

  debouncedLoad = _.debounce(async (indexPatternId) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (this.state.indexPatternId !== indexPatternId) {
      return;
    }

    const geoFields = indexPattern.fields.filter(filterGeoField);

    this.setState({
      isLoadingIndexPattern: false,
      indexPattern: indexPattern,
      indexPatternHasMultipleGeoFields: geoFields.length >= 2,
    });
  }, 300);

  _onSourceGeoSelect = (sourceGeoField) => {
    this.setState({
      sourceGeoField
    }, this.previewLayer);
  };

  _onDestGeoSelect = (destGeoField) => {
    this.setState({
      destGeoField
    }, this.previewLayer);
  };

  previewLayer = () => {
    const {
      indexPatternId,
      sourceGeoField,
      destGeoField,
    } = this.state;

    const sourceConfig = (indexPatternId && sourceGeoField && destGeoField)
      ? { indexPatternId, sourceGeoField, destGeoField }
      : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _renderGeoSelects() {
    if (!this.state.indexPattern || !this.state.indexPatternHasMultipleGeoFields) {
      return null;
    }

    return (
      <Fragment>
        <EuiFormRow label={i18n.translate('xpack.maps.source.pewPew.sourceGeoFieldLabel', {
          defaultMessage: 'Source'
        })}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.pewPew.sourceGeoFieldPlaceholder', {
              defaultMessage: 'Select source geo field'
            })}
            value={this.state.sourceGeoField}
            onChange={this._onSourceGeoSelect}
            filterField={filterGeoField}
            fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
          />
        </EuiFormRow>

        <EuiFormRow label={i18n.translate('xpack.maps.source.pewPew.destGeoFieldLabel', {
          defaultMessage: 'Destination'
        })}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.pewPew.destGeoFieldPlaceholder', {
              defaultMessage: 'Select destination geo field'
            })}
            value={this.state.destGeoField}
            onChange={this._onDestGeoSelect}
            filterField={filterGeoField}
            fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
          />
        </EuiFormRow>
      </Fragment>
    );
  }

  _renderIndexPatternSelect() {
    return (
      <EuiFormRow label={i18n.translate('xpack.maps.source.pewPew.indexPatternLabel', {
        defaultMessage: 'Index pattern'
      })}
      >
        <IndexPatternSelect
          indexPatternId={this.state.indexPatternId}
          onChange={this.onIndexPatternSelect}
          placeholder={i18n.translate('xpack.maps.source.pewPew.indexPatternPlaceholder', {
            defaultMessage: 'Select index pattern'
          })}
          fieldTypes={GEO_FIELD_TYPES}
        />
      </EuiFormRow>
    );
  }

  render() {
    let callout;
    if (this.state.indexPattern && !this.state.indexPatternHasMultipleGeoFields) {
      callout = (
        <EuiCallOut
          color="warning"
        >
          <p>
            <FormattedMessage
              id="xpack.maps.source.pewPew.noSourceAndDestDetails"
              defaultMessage="Selected index pattern does not contain source and destination fields."
            />
          </p>
        </EuiCallOut>
      );
    }

    return (
      <Fragment>
        {callout}
        {this._renderIndexPatternSelect()}
        {this._renderGeoSelects()}
      </Fragment>
    );
  }
}
