/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const ToggleArgInput = ({ onValueChange, argValue, argId, renderError }) => {
  const handleChange = () => onValueChange(!argValue);
  if (typeof argValue !== 'boolean') {
    renderError();
    return null;
  }
  return (
    <EuiFormRow display="rowCompressed">
      <EuiSwitch compressed id={argId} checked={argValue} onChange={handleChange} />
    </EuiFormRow>
  );
};

ToggleArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.string, PropTypes.object]).isRequired,
  argId: PropTypes.string.isRequired,
  renderError: PropTypes.func.isRequired,
};

export const toggle = () => ({
  name: 'toggle',
  displayName: 'Toggle',
  help: 'A true/false toggle switch',
  simpleTemplate: templateFromReactComponent(ToggleArgInput),
  default: 'false',
});
