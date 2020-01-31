/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { styleOptionShapes, rangeShape } from '../style_option_shapes';
import { VectorStyle } from '../../../vector_style';
import { ColorGradient } from '../../color_gradient';
import { CircleIcon } from './circle_icon';
import { getVectorStyleLabel } from '../get_vector_style_label';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { StyleLegendRow } from '../../style_legend_row';

function getLineWidthIcons() {
  const defaultStyle = {
    stroke: 'grey',
    fill: 'none',
    width: '12px',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '1px' }} />,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '2px' }} />,
    <CircleIcon style={{ ...defaultStyle, strokeWidth: '3px' }} />,
  ];
}

function getSymbolSizeIcons() {
  const defaultStyle = {
    stroke: 'grey',
    strokeWidth: 'none',
    fill: 'grey',
  };
  return [
    <CircleIcon style={{ ...defaultStyle, width: '4px' }} />,
    <CircleIcon style={{ ...defaultStyle, width: '8px' }} />,
    <CircleIcon style={{ ...defaultStyle, width: '12px' }} />,
  ];
}

function renderHeaderWithIcons(icons) {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
      {icons.map((icon, index) => {
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
            <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
            {spacer}
          </Fragment>
        );
      })}
    </EuiFlexGroup>
  );
}

const EMPTY_VALUE = '';

export class StylePropertyLegendRow extends Component {
  state = {
    label: '',
    hasLoadedFieldFormatter: false,
  };

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
    this._fieldValueFormatter = await this.props.getFieldFormatter(this.props.options.field);
    if (this._isMounted) {
      this.setState({ hasLoadedFieldFormatter: true });
    }
  }

  _loadLabel = async () => {
    if (this._isStatic()) {
      return;
    }

    // have to load label and then check for changes since field name stays constant while label may change
    const label = await this.props.getFieldLabel(this.props.options.field.name);
    if (this._prevLabel === label) {
      return;
    }

    this._prevLabel = label;
    if (this._isMounted) {
      this.setState({ label });
    }
  };

  _isStatic() {
    return (
      this.props.type === VectorStyle.STYLE_TYPE.STATIC ||
      !this.props.options.field ||
      !this.props.options.field.name
    );
  }

  _formatValue = value => {
    if (
      !this.state.hasLoadedFieldFormatter ||
      !this._fieldValueFormatter ||
      value === EMPTY_VALUE
    ) {
      return value;
    }

    return this._fieldValueFormatter(value);
  };

  render() {
    const { name, options, range } = this.props;
    if (this._isStatic()) {
      return null;
    }

    let header;
    if (options.color) {
      header = <ColorGradient colorRampName={options.color} />;
    } else if (name === 'lineWidth') {
      header = renderHeaderWithIcons(getLineWidthIcons());
    } else if (name === 'iconSize') {
      header = renderHeaderWithIcons(getSymbolSizeIcons());
    }

    return (
      <StyleLegendRow
        header={header}
        minLabel={this._formatValue(_.get(range, 'min', EMPTY_VALUE))}
        maxLabel={this._formatValue(_.get(range, 'max', EMPTY_VALUE))}
        propertyLabel={getVectorStyleLabel(name)}
        fieldLabel={this.state.label}
      />
    );
  }
}

StylePropertyLegendRow.propTypes = {
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  options: PropTypes.oneOfType(styleOptionShapes).isRequired,
  range: rangeShape,
  getFieldLabel: PropTypes.func.isRequired,
  getFieldFormatter: PropTypes.func.isRequired,
};
