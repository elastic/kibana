/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, ReactElement } from 'react';
import _ from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { Category } from './category';
import { IDynamicStyleProperty } from '../../properties/dynamic_style_property';

const EMPTY_VALUE = '';

export interface Break {
  color: string;
  label: ReactElement<any> | string | number;
  svg?: string;
  symbolId?: string;
}

interface Props {
  style: IDynamicStyleProperty<any>;
  breaks: Break[];
  isLinesOnly: boolean;
  isPointsOnly: boolean;
}

interface State {
  label: string;
}

export class BreakedLegend extends Component<Props, State> {
  private _isMounted: boolean = false;

  state: State = {
    label: EMPTY_VALUE,
  };

  componentDidMount() {
    this._isMounted = true;
    this._loadLabel();
  }

  componentDidUpdate() {
    this._loadLabel();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _loadLabel() {
    const field = this.props.style.getField();
    if (!field) {
      return;
    }
    const label = await field.getLabel();
    if (this._isMounted && !_.isEqual(this.state.label, label)) {
      this.setState({ label });
    }
  }

  render() {
    if (this.state.label === EMPTY_VALUE) {
      return null;
    }

    const categories = this.props.breaks.map(({ symbolId, svg, label, color }, index) => {
      return (
        <EuiFlexItem key={index}>
          <Category
            styleName={this.props.style.getStyleName()}
            label={label}
            color={color}
            isLinesOnly={this.props.isLinesOnly}
            isPointsOnly={this.props.isPointsOnly}
            symbolId={symbolId}
            svg={svg}
          />
        </EuiFlexItem>
      );
    });

    return (
      <div>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              title={this.props.style.getDisplayStyleName()}
              content={this.state.label}
            >
              <EuiText className="eui-textTruncate" size="xs" style={{ maxWidth: '180px' }}>
                <small>
                  <strong>{this.state.label}</strong>
                </small>
              </EuiText>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup direction="column" gutterSize="none">
          {categories}
        </EuiFlexGroup>
      </div>
    );
  }
}
