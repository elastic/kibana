/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { EuiFieldNumber, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../../public/components/enhance/stateful_prop';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { Number: strings } = ArgumentStrings;

// This is basically a direct copy of the string input, but with some Number() goodness maybe you think that's cheating and it should be
// abstracted. If you can think of a 3rd or 4th usage for that abstraction, cool, do it, just don't make it more confusing. Copying is the
// most understandable way to do this. There, I said it.

// TODO: Support max/min as options
const NumberArgInput = ({ updateValue, value, confirm, commit, argId }) => (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem>
      <EuiFieldNumber
        compressed
        id={argId}
        value={Number(value)}
        onChange={confirm ? updateValue : ev => commit(Number(ev.target.value))}
      />
    </EuiFlexItem>
    {confirm && (
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={() => commit(Number(value))}>
          {confirm}
        </EuiButton>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

NumberArgInput.propTypes = {
  argId: PropTypes.string.isRequired,
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
};

const EnhancedNumberArgInput = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value')
)(NumberArgInput);

EnhancedNumberArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const number = () => ({
  name: 'number',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(EnhancedNumberArgInput),
  default: '0',
});
