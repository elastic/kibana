/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSwitch, EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { TooltipSelector } from '../../../components/tooltip_selector';

import { indexPatternService } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { getTermsFields, getSourceFields } from '../../../index_pattern_util';
import { ValidatedRange } from '../../../components/validated_range';
import { SORT_ORDER } from '../../../../common/constants';

export class UpdateSourceEditor extends Component {
  static propTypes = {
    indexPatternId: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    filterByMapBounds: PropTypes.bool.isRequired,
    tooltipProperties: PropTypes.arrayOf(PropTypes.string).isRequired,
    sortField: PropTypes.string,
    sortOrder: PropTypes.string.isRequired,
    useTopHits: PropTypes.bool.isRequired,
    topHitsSplitField: PropTypes.string,
    topHitsSize: PropTypes.number.isRequired,
  };

  state = {
    tooltipFields: null,
    termFields: null,
    sortFields: null,
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadFields() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this.props.indexPatternId);
    } catch (err) {
      if (this._isMounted) {
        this.setState({
          loadError: i18n.translate('xpack.maps.source.esSearch.loadErrorMessage', {
            defaultMessage: `Unable to find Index pattern {id}`,
            values: {
              id: this.props.indexPatternId,
            },
          }),
        });
      }
      return;
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({
      tooltipFields: getSourceFields(indexPattern.fields),
      termFields: getTermsFields(indexPattern.fields),
      sortFields: indexPattern.fields.filter(field => field.sortable),
    });
  }
  _onTooltipPropertiesChange = propertyNames => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
  };

  _onFilterByMapBoundsChange = event => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  onUseTopHitsChange = event => {
    this.props.onChange({ propName: 'useTopHits', value: event.target.checked });
  };

  onTopHitsSplitFieldChange = topHitsSplitField => {
    this.props.onChange({ propName: 'topHitsSplitField', value: topHitsSplitField });
  };

  onSortFieldChange = sortField => {
    this.props.onChange({ propName: 'sortField', value: sortField });
  };

  onSortOrderChange = e => {
    this.props.onChange({ propName: 'sortOrder', value: e.target.value });
  };

  onTopHitsSizeChange = size => {
    this.props.onChange({ propName: 'topHitsSize', value: size });
  };

  renderTopHitsForm() {
    if (!this.props.useTopHits) {
      return null;
    }

    let sizeSlider;
    if (this.props.topHitsSplitField) {
      sizeSlider = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSizeLabel', {
            defaultMessage: 'Documents per entity',
          })}
          display="rowCompressed"
        >
          <ValidatedRange
            min={1}
            max={100}
            step={1}
            value={this.props.topHitsSize}
            onChange={this.onTopHitsSizeChange}
            showLabels
            showInput
            showRange
            data-test-subj="layerPanelTopHitsSize"
            compressed
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSplitFieldLabel', {
            defaultMessage: 'Entity',
          })}
          display="rowCompressed"
        >
          <SingleFieldSelect
            placeholder={i18n.translate(
              'xpack.maps.source.esSearch.topHitsSplitFieldSelectPlaceholder',
              {
                defaultMessage: 'Select entity field',
              }
            )}
            value={this.props.topHitsSplitField}
            onChange={this.onTopHitsSplitFieldChange}
            fields={this.state.termFields}
            compressed
          />
        </EuiFormRow>

        {sizeSlider}
      </Fragment>
    );
  }

  render() {
    return (
      <Fragment>
        <EuiFormRow>
          <TooltipSelector
            tooltipProperties={this.props.tooltipProperties}
            onChange={this._onTooltipPropertiesChange}
            fields={this.state.tooltipFields}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.sortLabel', {
            defaultMessage: `Sort`,
          })}
        >
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem>
              <SingleFieldSelect
                placeholder={i18n.translate(
                  'xpack.maps.source.esSearch.sortFieldSelectPlaceholder',
                  {
                    defaultMessage: 'Select sort field',
                  }
                )}
                value={this.props.sortField}
                onChange={this.onSortFieldChange}
                fields={this.state.sortFields}
                compressed
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                disabled={!this.props.sortField}
                options={[
                  { text: 'ASC', value: SORT_ORDER.ASC },
                  { text: 'DESC', value: SORT_ORDER.DESC },
                ]}
                value={this.props.sortOrder}
                onChange={this.onSortOrderChange}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiFormRow display="rowCompressed">
          <EuiSwitch
            label={i18n.translate('xpack.maps.source.esSearch.useTopHitsLabel', {
              defaultMessage: `Show top documents based on sort order`,
            })}
            checked={this.props.useTopHits}
            onChange={this.onUseTopHitsChange}
            compressed
          />
        </EuiFormRow>

        {this.renderTopHitsForm()}

        <EuiFormRow display="rowCompressed">
          <EuiSwitch
            label={i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
              defaultMessage: `Dynamically filter for data in the visible map area`,
            })}
            checked={this.props.filterByMapBounds}
            onChange={this._onFilterByMapBoundsChange}
            compressed
          />
        </EuiFormRow>
      </Fragment>
    );
  }
}
