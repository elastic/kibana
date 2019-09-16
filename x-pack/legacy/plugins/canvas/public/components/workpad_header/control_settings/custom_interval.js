/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiButton, EuiFieldText } from '@elastic/eui';
import { getTimeInterval } from '../../../lib/time_interval';

export const CustomInterval = ({ gutterSize, buttonSize, onSubmit, defaultValue }) => {
  const [customInterval, setCustomInterval] = useState(defaultValue);
  const refreshInterval = getTimeInterval(customInterval);
  const isInvalid = Boolean(customInterval.length && !refreshInterval);

  const handleChange = ev => setCustomInterval(ev.target.value);

  return (
    <form
      onSubmit={ev => {
        ev.preventDefault();
        onSubmit(refreshInterval);
      }}
    >
      <EuiFlexGroup gutterSize={gutterSize}>
        <EuiFlexItem>
          <EuiFormRow
            label="Set a custom interval"
            helpText="Use shorthand notation, like 30s, 10m, or 1h"
            compressed
          >
            <EuiFieldText
              isInvalid={isInvalid}
              value={customInterval}
              onChange={handleChange}
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFormRow label="&nbsp;">
            <EuiButton
              disabled={isInvalid}
              size={buttonSize}
              type="submit"
              style={{ minWidth: 'auto' }}
            >
              Set
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
};

CustomInterval.propTypes = {
  buttonSize: PropTypes.string,
  gutterSize: PropTypes.string,
  defaultValue: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};

CustomInterval.defaultProps = {
  buttonSize: 's',
  gutterSize: 's',
  defaultValue: '',
};
