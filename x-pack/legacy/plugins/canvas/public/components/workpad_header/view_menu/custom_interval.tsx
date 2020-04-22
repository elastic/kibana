/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiButton, EuiFieldText } from '@elastic/eui';
import { ButtonSize } from '@elastic/eui/src/components/button/button';
import { FlexGroupGutterSize } from '@elastic/eui/src/components/flex/flex_group';
import { getTimeInterval } from '../../../lib/time_interval';

import { ComponentStrings } from '../../../../i18n';
const { WorkpadHeaderCustomInterval: strings } = ComponentStrings;

interface Props {
  gutterSize: FlexGroupGutterSize;
  buttonSize: ButtonSize;
  onSubmit: (interval: number) => void;
  defaultValue: any;
}

export const CustomInterval = ({ gutterSize, buttonSize, onSubmit, defaultValue }: Props) => {
  const [customInterval, setCustomInterval] = useState(defaultValue);
  const refreshInterval = getTimeInterval(customInterval);
  const isInvalid = Boolean(customInterval.length && !refreshInterval);

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => setCustomInterval(ev.target.value);

  return (
    <form
      onSubmit={ev => {
        ev.preventDefault();
        if (!isInvalid && refreshInterval) {
          onSubmit(refreshInterval);
        }
      }}
    >
      <EuiFlexGroup gutterSize={gutterSize}>
        <EuiFlexItem>
          <EuiFormRow
            label={strings.getFormLabel()}
            helpText={strings.getFormDescription()}
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
          <EuiFormRow hasEmptyLabelSpace={true} compressed>
            <EuiButton
              disabled={isInvalid}
              size={buttonSize}
              type="submit"
              style={{ minWidth: 'auto' }}
            >
              {strings.getButtonLabel()}
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
