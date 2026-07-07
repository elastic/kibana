/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { EuiFieldNumber, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { withDebounceArg } from '../../../public/components/with_debounce_arg';
import { ArgumentStrings } from '../../../i18n';

const { Number: strings } = ArgumentStrings;

// This is basically a direct copy of the string input, but with some Number() goodness maybe you think that's cheating and it should be
// abstracted. If you can think of a 3rd or 4th usage for that abstraction, cool, do it, just don't make it more confusing. Copying is the
// most understandable way to do this. There, I said it.

// TODO: Support max/min as options
const NumberArgInput = ({ argId, argValue, typeInstance, onValueChange }) => {
  const [value, setValue] = useState(argValue);
  const confirm = typeInstance?.options?.confirm;

  useEffect(() => {
    setValue(argValue);
  }, [argValue]);

  const onChange = useCallback(
    (ev) => {
      const { value } = ev.target;
      setValue(value);
      if (!confirm) {
        onValueChange(value);
      }
    },
    [confirm, onValueChange]
  );

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFieldNumber compressed id={argId} value={Number(value)} onChange={onChange} />
      </EuiFlexItem>

      {confirm && (
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={() => onValueChange(Number(value))}>
            {confirm}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

NumberArgInput.propTypes = {
  argId: PropTypes.string.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  typeInstance: PropTypes.object.isRequired,
  onValueChange: PropTypes.func.isRequired,
};

export const number = () => ({
  name: 'number',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(withDebounceArg(NumberArgInput)),
  default: '0',
});
