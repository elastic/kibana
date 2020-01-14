/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { Toggle: strings } = ArgumentStrings;

const ToggleArgInput = ({ onValueChange, argValue, argId, renderError, typeInstance }) => {
  const handleChange = () => onValueChange(!argValue);
  if (typeof argValue !== 'boolean') {
    renderError();
    return null;
  }
  return (
    <EuiFormRow display="columnCompressedSwitch">
      <EuiSwitch
        compressed
        id={argId}
        checked={argValue}
        onChange={handleChange}
        className="canvasArg__switch"
        aria-label={typeInstance.displayName}
        label=""
        showLabel={false}
      />
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
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(ToggleArgInput),
  default: 'false',
});
