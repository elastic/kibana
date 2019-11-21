/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiSelect } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { Select: strings } = ArgumentStrings;

const SelectArgInput = ({ typeInstance, onValueChange, argValue, argId }) => {
  const choices = typeInstance.options.choices.map(({ value, name }) => ({ value, text: name }));
  const handleChange = ev => {
    // Get the value from the choices passed in since it could be a number or
    // boolean, but ev.target.value is always a string
    const { value } = choices[ev.target.selectedIndex];
    return onValueChange(value);
  };

  return (
    <EuiSelect compressed id={argId} value={argValue} options={choices} onChange={handleChange} />
  );
};

SelectArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  typeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
    options: PropTypes.shape({
      choices: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string.isRequired,
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])
            .isRequired,
        })
      ).isRequired,
    }),
  }),
  argId: PropTypes.string.isRequired,
};

export const select = () => ({
  name: 'select',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(SelectArgInput),
});
