/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, ChangeEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiFieldText } from '@elastic/eui';
import moment, { Moment } from 'moment';

export interface Props {
  /** Selected string value of input */
  strValue: string;
  /** Function invoked with string when input is changed */
  setStrValue: (value: string) => void;
  /** Function invoked with moment when input is changed with valid datetime */
  setMoment: (value: Moment) => void;
  /** Boolean denotes whether current input value is valid date */
  valid: boolean;
  /** Function invoked with value validity when input is changed */
  setValid: (valid: boolean) => void;
}

export const DatetimeInput: FunctionComponent<Props> = ({
  strValue,
  setStrValue,
  setMoment,
  valid,
  setValid,
}) => {
  function check(e: ChangeEvent<HTMLInputElement>) {
    const parsed = moment(e.target.value, 'YYYY-MM-DD HH:mm:ss', true);
    if (parsed.isValid()) {
      setMoment(parsed);
      setValid(true);
    } else {
      setValid(false);
    }
    setStrValue(e.target.value);
  }

  return (
    <EuiFieldText
      compressed
      value={strValue}
      onChange={check}
      isInvalid={!valid}
      style={{ textAlign: 'center' }}
    />
  );
};

DatetimeInput.propTypes = {
  setMoment: PropTypes.func,
  strValue: PropTypes.string,
  setStrValue: PropTypes.func,
  valid: PropTypes.bool,
  setValid: PropTypes.func,
};
