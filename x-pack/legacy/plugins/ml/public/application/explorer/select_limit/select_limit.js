/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering a select element with limit options.
 */
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { useObservable } from 'react-use';
import { BehaviorSubject } from 'rxjs';

import { EuiSelect } from '@elastic/eui';

const optionsMap = {
  '5': 5,
  '10': 10,
  '25': 25,
  '50': 50,
};

const LIMIT_OPTIONS = [
  { val: 5, display: '5' },
  { val: 10, display: '10' },
  { val: 25, display: '25' },
  { val: 50, display: '50' },
];

function optionValueToLimit(value) {
  // Get corresponding limit object with required display and val properties from the specified value.
  let limit = LIMIT_OPTIONS.find(opt => opt.val === value);

  // Default to 10 if supplied value doesn't map to one of the options.
  if (limit === undefined) {
    limit = LIMIT_OPTIONS[1];
  }

  return limit;
}

const EUI_OPTIONS = LIMIT_OPTIONS.map(({ display, val }) => ({
  value: display,
  text: val,
}));

export const limit$ = new BehaviorSubject(LIMIT_OPTIONS[1]);

class SelectLimitUnwrapped extends Component {
  onChange = e => {
    const valueDisplay = e.target.value;
    const limit = optionValueToLimit(optionsMap[valueDisplay]);
    limit$.next(limit);
  };

  render() {
    return (
      <EuiSelect options={EUI_OPTIONS} onChange={this.onChange} value={this.props.limit.display} />
    );
  }
}

SelectLimitUnwrapped.propTypes = {
  limit: PropTypes.object,
};

SelectLimitUnwrapped.defaultProps = {
  limit: LIMIT_OPTIONS[1],
};

export const SelectLimit = props => {
  const limit = useObservable(limit$);
  return <SelectLimitUnwrapped limit={limit} {...props} />;
};
