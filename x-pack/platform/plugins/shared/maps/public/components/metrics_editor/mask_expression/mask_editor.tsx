/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiPopoverFooter,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { MASK_OPERATOR } from '../../../../common/constants';
import { AggDescriptor } from '../../../../common/descriptor_types';
import { panelStrings } from '../../../connected_components/panel_strings';
import { ABOVE, BELOW } from '../../../classes/layers/vector_layer/mask';

const operatorOptions = [
  {
    value: MASK_OPERATOR.BELOW,
    text: BELOW,
  },
  {
    value: MASK_OPERATOR.ABOVE,
    text: ABOVE,
  },
];

interface Props {
  metric: AggDescriptor;
  onChange: (metric: AggDescriptor) => void;
  onClose: () => void;
}

interface State {
  operator: MASK_OPERATOR;
  value: number | string;
}

export class MaskEditor extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      operator:
        this.props.metric.mask !== undefined
          ? this.props.metric.mask.operator
          : MASK_OPERATOR.BELOW,
      value: this.props.metric.mask !== undefined ? this.props.metric.mask.value : '',
    };
  }

  _onSet = () => {
    if (this._isValueInValid()) {
      return;
    }

    this.props.onChange({
      ...this.props.metric,
      mask: {
        operator: this.state.operator,
        value: this.state.value as number,
      },
    });
    this.props.onClose();
  };

  _onClear = () => {
    const newMetric = {
      ...this.props.metric,
    };
    delete newMetric.mask;
    this.props.onChange(newMetric);
    this.props.onClose();
  };

  _onOperatorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      operator: e.target.value as MASK_OPERATOR,
    });
  };

  _onValueChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      value: isNaN(sanitizedValue) ? evt.target.value : sanitizedValue,
    });
  };

  _hasChanges() {
    return (
      this.props.metric.mask === undefined ||
      this.props.metric.mask.operator !== this.state.operator ||
      this.props.metric.mask.value !== this.state.value
    );
  }

  _isValueInValid() {
    return typeof this.state.value === 'string';
  }

  _renderForm() {
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSelect
              id="maskOperatorSelect"
              options={operatorOptions}
              value={this.state.operator}
              onChange={this._onOperatorChange}
              aria-label={i18n.translate('xpack.maps.maskEditor.operatorSelectLabel', {
                defaultMessage: 'Mask operator select',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiFieldNumber
              value={this.state.value}
              onChange={this._onValueChange}
              aria-label={i18n.translate('xpack.maps.maskEditor.valueInputLabel', {
                defaultMessage: 'Mask value input',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  _renderFooter() {
    return (
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButtonEmpty onClick={this.props.onClose} size="s">
              {panelStrings.close}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty
              color="danger"
              isDisabled={this.props.metric.mask === undefined}
              onClick={this._onClear}
              size="s"
            >
              {panelStrings.clear}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              isDisabled={this._isValueInValid() || !this._hasChanges()}
              onClick={this._onSet}
              size="s"
            >
              {panelStrings.apply}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    );
  }

  render() {
    return (
      <>
        {this._renderForm()}
        <EuiSpacer size="xs" />
        {this._renderFooter()}
      </>
    );
  }
}
