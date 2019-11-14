/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';

import { rangeShape } from '../style_option_shapes';
import { CircleIcon } from './circle_icon';
import { getVectorStyleLabel } from '../get_vector_style_label';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { StyleLegendRow } from '../../../components/style_legend_row';
import { vectorStyles } from '../../vector_style_defaults';

function getLineWidthIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'none',
    width: '12px',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '1px' }}/>,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '2px' }}/>,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '3px' }}/>,
  ];
}

function getSymbolSizeIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'grey',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, width: '4px' }}/>,
    <CircleIcon style={{ ...defaultStyle, width: '8px' }}/>,
    <CircleIcon style={{ ...defaultStyle, width: '12px' }}/>,
  ];
}

function renderHeaderWithIcons(icons) {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
      {
        icons.map((icon, index) => {
          const isLast = index === icons.length - 1;
          let spacer;
          if (!isLast) {
            spacer = (
              <EuiFlexItem>
                <EuiHorizontalRule margin="xs" />
              </EuiFlexItem>
            );
          }
          return (
            <Fragment key={index}>
              <EuiFlexItem grow={false}>
                {icon}
              </EuiFlexItem>
              {spacer}
            </Fragment>
          );
        })
      }
    </EuiFlexGroup>
  );
}

const EMPTY_VALUE = '';

export class StylePropertyLegendRow extends Component {

  state = {
    label: '',
    hasLoadedFieldFormatter: false,
  }

  componentDidMount() {
    this._isMounted = true;
    this._prevLabel = undefined;
    this._fieldValueFormatter = undefined;
    this._loadLabel();
    this._loadFieldFormatter();
  }

  componentDidUpdate() {
    // label could change so it needs to be loaded on update
    this._loadLabel();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadFieldFormatter() {
    if (this.props.style.isDynamic() && this.props.style.getField() && this.props.style.getField().getSource()) {
      const field = this.props.style.getField();
      const source = field.getSource();
      this._fieldValueFormatter = await source.getFieldFormatter(field.getName());
    } else {
      this._fieldValueFormatter = null;
    }
    if (this._isMounted) {
      this.setState({ hasLoadedFieldFormatter: true });
    }
  }

  _loadLabel = async () => {
    if (this._isStatic()) {
      return;
    }

    // have to load label and then check for changes since field name stays constant while label may change
    const label = await this.props.style.getField().getLabel();
    if (this._prevLabel === label) {
      return;
    }

    this._prevLabel = label;
    if (this._isMounted) {
      this.setState({ label });
    }
  }

  _isStatic() {
    return !this.props.style.isDynamic() || !this.props.style.getField() || !this.props.style.getField().getName();
  }

  _formatValue = value => {
    if (!this.state.hasLoadedFieldFormatter || !this._fieldValueFormatter || value === EMPTY_VALUE) {
      return value;
    }

    return this._fieldValueFormatter(value);
  }

  render() {

    const { range, style } = this.props;
    if (this._isStatic()) {
      return null;
    }

    let header;
    if (style.getOptions().color) {
      header = style.renderHeader();
    } else if (style.getStyleName() === vectorStyles.LINE_WIDTH) {
      header = renderHeaderWithIcons(getLineWidthIcons());
    } else if (style.getStyleName() === vectorStyles.ICON_SIZE) {
      header = renderHeaderWithIcons(getSymbolSizeIcons());
    }

    return (
      <StyleLegendRow
        header={header}
        minLabel={this._formatValue(_.get(range, 'min', EMPTY_VALUE))}
        maxLabel={this._formatValue(_.get(range, 'max', EMPTY_VALUE))}
        propertyLabel={getVectorStyleLabel(style.getStyleName())}
        fieldLabel={this.state.label}
      />
    );
  }
}

StylePropertyLegendRow.propTypes = {
  range: rangeShape
};
