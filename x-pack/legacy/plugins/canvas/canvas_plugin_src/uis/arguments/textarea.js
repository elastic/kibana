/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { compose, withProps } from 'recompose';
import { EuiFormRow, EuiTextArea, EuiSpacer, EuiButton } from '@elastic/eui';
import { get } from 'lodash';
import { createStatefulPropHoc } from '../../../public/components/enhance/stateful_prop';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { Textarea: strings } = ArgumentStrings;

const TextAreaArgInput = ({ updateValue, value, confirm, commit, renderError, argId }) => {
  if (typeof value !== 'string') {
    renderError();
    return null;
  }
  return (
    <div>
      <EuiFormRow display="rowCompressed">
        <EuiTextArea
          className="canvasTextArea__code"
          id={argId}
          compressed
          rows={10}
          value={value}
          resize="none"
          onChange={confirm ? updateValue : ev => commit(ev.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiButton size="s" onClick={() => commit(value)}>
        {confirm}
      </EuiButton>
      <EuiSpacer size="xs" />
    </div>
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
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(EnhancedTextAreaArgInput),
});
