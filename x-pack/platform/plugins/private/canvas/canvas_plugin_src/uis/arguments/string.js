/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexItem, EuiFlexGroup, EuiFieldText, EuiButton } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { withDebounceArg } from '../../../public/components/with_debounce_arg';

import { ArgumentStrings } from '../../../i18n';

const { String: strings } = ArgumentStrings;

const StringArgInput = ({ argValue, typeInstance, onValueChange, argId }) => {
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
        <EuiFieldText compressed id={argId} value={value} onChange={onChange} />
      </EuiFlexItem>
      {confirm && (
        <EuiFlexItem grow={false} className="canvasSidebar__panel-noMinWidth">
          <EuiButton size="s" onClick={() => onValueChange(value)}>
            {confirm}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

StringArgInput.propTypes = {
  argId: PropTypes.string.isRequired,
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const string = () => ({
  name: 'string',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(withDebounceArg(StringArgInput)),
});
