/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { EuiForm, EuiTextArea, EuiSpacer, EuiButton } from '@elastic/eui';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../../public/components/enhance/stateful_prop';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const TextAreaArgInput = ({ updateValue, value, confirm, commit, renderError, argId }) => {
  if (typeof value !== 'string') {
    renderError();
    return null;
  }
  return (
    <EuiForm>
      <EuiTextArea
        className="canvasTextArea--code"
        id={argId}
        rows={10}
        value={value}
        resize="none"
        onChange={confirm ? updateValue : ev => commit(ev.target.value)}
      />
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={() => commit(value)}>
        {confirm}
      </EuiButton>
      <EuiSpacer size="xs" />
    </EuiForm>
  );
};

TextAreaArgInput.propTypes = {
  updateValue: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  confirm: PropTypes.string,
  commit: PropTypes.func.isRequired,
  renderError: PropTypes.func,
  argId: PropTypes.string.isRequired,
};

const EnhancedTextAreaArgInput = compose(
  withProps(({ onValueChange, typeInstance, argValue }) => ({
    confirm: get(typeInstance, 'options.confirm'),
    commit: onValueChange,
    value: argValue,
  })),
  createStatefulPropHoc('value')
)(TextAreaArgInput);

EnhancedTextAreaArgInput.propTypes = {
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
  renderError: PropTypes.func.isRequired,
};

export const textarea = () => ({
  name: 'textarea',
  displayName: 'Textarea',
  help: 'Input long strings',
  template: templateFromReactComponent(EnhancedTextAreaArgInput),
});
