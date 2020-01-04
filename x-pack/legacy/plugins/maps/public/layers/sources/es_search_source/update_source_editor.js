/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFormRow,
  EuiSwitch,
  EuiSelect,
  EuiTitle,
  EuiPanel,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { TooltipSelector } from '../../../components/tooltip_selector';

import { indexPatternService } from '../../../kibana_services';
import { i18n } from '@kbn/i18n';
import { getTermsFields, getSourceFields } from '../../../index_pattern_util';
import { ValidatedRange } from '../../../components/validated_range';
import { DEFAULT_MAX_INNER_RESULT_WINDOW, SORT_ORDER } from '../../../../common/constants';
import { ESDocField } from '../../fields/es_doc_field';
import { FormattedMessage } from '@kbn/i18n/react';
import { loadIndexSettings } from './load_index_settings';

export class UpdateSourceEditor extends Component {
  static propTypes = {
    indexPatternId: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    tooltipFields: PropTypes.arrayOf(PropTypes.object).isRequired,
    sortField: PropTypes.string,
    sortOrder: PropTypes.string.isRequired,
    useTopHits: PropTypes.bool.isRequired,
    topHitsSplitField: PropTypes.string,
    topHitsSize: PropTypes.number.isRequired,
    source: PropTypes.object,
  };

  state = {
    sourceFields: null,
    termFields: null,
    sortFields: null,
    maxInnerResultWindow: DEFAULT_MAX_INNER_RESULT_WINDOW,
  };

  componentDidMount() {
    this._isMounted = true;
    this.loadFields();
    this.loadIndexSettings();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadIndexSettings() {
    try {
      const indexPattern = await indexPatternService.get(this.props.indexPatternId);
      const { maxInnerResultWindow } = await loadIndexSettings(indexPattern.title);
      if (this._isMounted) {
        this.setState({ maxInnerResultWindow });
      }
    } catch (err) {
      return;
    }
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

    //todo move this all to the source
    const rawTooltipFields = getSourceFields(indexPattern.fields);
    const sourceFields = rawTooltipFields.map(field => {
      return new ESDocField({
        fieldName: field.name,
        source: this.props.source,
      });
    });

    this.setState({
      sourceFields: sourceFields,
      termFields: getTermsFields(indexPattern.fields), //todo change term fields to use fields
      sortFields: indexPattern.fields.filter(field => field.sortable), //todo change sort fields to use fields
    });
  }
  _onTooltipPropertiesChange = propertyNames => {
    this.props.onChange({ propName: 'tooltipProperties', value: propertyNames });
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
    const topHitsSwitch = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esSearch.topHitsLabel', {
          defaultMessage: `Top hits`,
        })}
        display="columnCompressed"
      >
        <EuiSwitch
          label={i18n.translate('xpack.maps.source.esSearch.useTopHitsLabel', {
            defaultMessage: `Show top hits per entity`,
          })}
          checked={this.props.useTopHits}
          onChange={this.onUseTopHitsChange}
          compressed
        />
      </EuiFormRow>
    );

    if (!this.props.useTopHits) {
      return topHitsSwitch;
    }

    let sizeSlider;
    if (this.props.topHitsSplitField) {
      sizeSlider = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSizeLabel', {
            defaultMessage: 'Documents per entity',
          })}
          display="columnCompressed"
        >
          <ValidatedRange
            min={1}
            max={this.state.maxInnerResultWindow}
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
        {topHitsSwitch}
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSplitFieldLabel', {
            defaultMessage: 'Entity',
          })}
          display="columnCompressed"
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

  _renderTooltipsPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.esSearch.tooltipsTitle"
              defaultMessage="Tooltip fields"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <TooltipSelector
          tooltipFields={this.props.tooltipFields}
          onChange={this._onTooltipPropertiesChange}
          fields={this.state.sourceFields}
        />
      </EuiPanel>
    );
  }

  _renderSortPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage id="xpack.maps.esSearch.sortTitle" defaultMessage="Sorting" />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.sortFieldLabel', {
            defaultMessage: 'Field',
          })}
          display="columnCompressed"
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.source.esSearch.sortFieldSelectPlaceholder', {
              defaultMessage: 'Select sort field',
            })}
            value={this.props.sortField}
            onChange={this.onSortFieldChange}
            fields={this.state.sortFields}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.sortOrderLabel', {
            defaultMessage: 'Order',
          })}
          display="columnCompressed"
        >
          <EuiSelect
            disabled={!this.props.sortField}
            options={[
              {
                text: i18n.translate('xpack.maps.source.esSearch.ascendingLabel', {
                  defaultMessage: 'ascending',
                }),
                value: SORT_ORDER.ASC,
              },
              {
                text: i18n.translate('xpack.maps.source.esSearch.descendingLabel', {
                  defaultMessage: 'descending',
                }),
                value: SORT_ORDER.DESC,
              },
            ]}
            value={this.props.sortOrder}
            onChange={this.onSortOrderChange}
            compressed
          />
        </EuiFormRow>

        <EuiHorizontalRule margin="xs" />
        {this.renderTopHitsForm()}
      </EuiPanel>
    );
  }

  render() {
    return (
      <Fragment>
        {this._renderTooltipsPanel()}
        <EuiSpacer size="s" />

        {this._renderSortPanel()}
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
