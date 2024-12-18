/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiButton, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiButtonSize } from '@elastic/eui/src/components/button/button';
import { EuiFlexGroupGutterSize } from '@elastic/eui/src/components/flex/flex_group';
import { getTimeInterval } from '../../../lib/time_interval';

const strings = {
  getButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderCustomInterval.confirmButtonLabel', {
      defaultMessage: 'Set',
    }),
  getFormDescription: () =>
    i18n.translate('xpack.canvas.workpadHeaderCustomInterval.formDescription', {
      defaultMessage:
        'Use shorthand notation, like {secondsExample}, {minutesExample}, or {hoursExample}',
      values: {
        secondsExample: '30s',
        minutesExample: '10m',
        hoursExample: '1h',
      },
    }),
  getFormLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderCustomInterval.formLabel', {
      defaultMessage: 'Set a custom interval',
    }),
};

interface Props {
  gutterSize: EuiFlexGroupGutterSize;
  buttonSize: EuiButtonSize;
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
      onSubmit={(ev) => {
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
            display="rowCompressed"
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
          <EuiFormRow hasEmptyLabelSpace={true} display="rowCompressed">
            <EuiButton disabled={isInvalid} size={buttonSize} type="submit" minWidth="auto">
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
