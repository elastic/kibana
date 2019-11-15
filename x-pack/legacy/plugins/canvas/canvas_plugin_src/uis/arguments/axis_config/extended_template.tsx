/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ChangeEvent, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiSelect, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import immutable from 'object-path-immutable';
import { get } from 'lodash';
import { ExpressionAST } from '../../../../types';
import { ArgumentStrings } from '../../../../i18n';

const { AxisConfig: strings } = ArgumentStrings;

const { set } = immutable;

const defaultExpression: ExpressionAST = {
  type: 'expression',
  chain: [
    {
      type: 'function',
      function: 'axisConfig',
      arguments: {},
    },
  ],
};

export interface Props {
  onValueChange: (newValue: ExpressionAST) => void;
  argValue: boolean | ExpressionAST;
  typeInstance: {
    name: 'xaxis' | 'yaxis';
  };
}

export class ExtendedTemplate extends PureComponent<Props> {
  static propTypes = {
    onValueChange: PropTypes.func.isRequired,
    argValue: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.shape({
        chain: PropTypes.array,
      }).isRequired,
    ]),
    typeInstance: PropTypes.object.isRequired,
  };

  static displayName = 'AxisConfigExtendedInput';

  // TODO: this should be in a helper, it's the same code from container_style
  getArgValue = (name: string, alt: string) => {
    return get(this.props.argValue, `chain.0.arguments.${name}.0`, alt);
  };

  // TODO: this should be in a helper, it's the same code from container_style
  setArgValue = (name: string) => (ev: ChangeEvent<HTMLSelectElement>) => {
    if (!ev || !ev.target) {
      return;
    }

    const val = ev.target.value;
    const { argValue, onValueChange } = this.props;
    const oldVal = typeof argValue === 'boolean' ? defaultExpression : argValue;
    const newValue = set(oldVal, `chain.0.arguments.${name}.0`, val);
    onValueChange(newValue);
  };

  render() {
    const isDisabled = typeof this.props.argValue === 'boolean' && this.props.argValue === false;

    if (isDisabled) {
      return (
        <EuiText color="subdued" size="xs">
          <p>{strings.getDisabledText()}</p>
        </EuiText>
      );
    }

    const positions = {
      xaxis: [strings.getPositionBottom(), strings.getPositionTop()],
      yaxis: [strings.getPositionLeft(), strings.getPositionRight()],
    };
    const argName = this.props.typeInstance.name;
    const position = this.getArgValue('position', positions[argName][0]);

    const options = positions[argName].map(val => ({ value: val, text: val }));

    return (
      <Fragment>
        <EuiFormRow label={strings.getPositionLabel()} display="columnCompressed">
          <EuiSelect
            compressed
            value={position}
            options={options}
            onChange={this.setArgValue('position')}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
}
