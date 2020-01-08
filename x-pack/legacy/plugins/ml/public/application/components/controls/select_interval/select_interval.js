/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering a select element with various aggregation interval levels.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { BehaviorSubject } from 'rxjs';

import { EuiSelect } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { injectObservablesAsProps } from '../../../util/observable_utils';

const OPTIONS = [
  {
    value: 'auto',
    text: i18n.translate('xpack.ml.controls.selectInterval.autoLabel', { defaultMessage: 'Auto' }),
  },
  {
    value: 'hour',
    text: i18n.translate('xpack.ml.controls.selectInterval.hourLabel', {
      defaultMessage: '1 hour',
    }),
  },
  {
    value: 'day',
    text: i18n.translate('xpack.ml.controls.selectInterval.dayLabel', { defaultMessage: '1 day' }),
  },
  {
    value: 'second',
    text: i18n.translate('xpack.ml.controls.selectInterval.showAllLabel', {
      defaultMessage: 'Show all',
    }),
  },
];

function optionValueToInterval(value) {
  // Builds the corresponding interval object with the required display and val properties
  // from the specified value.
  const option = OPTIONS.find(opt => opt.value === value);

  // Default to auto if supplied value doesn't map to one of the options.
  let interval = OPTIONS[0];
  if (option !== undefined) {
    interval = { display: option.text, val: option.value };
  }

  return interval;
}

export const interval$ = new BehaviorSubject(optionValueToInterval(OPTIONS[0].value));

class SelectIntervalUnwrapped extends Component {
  static propTypes = {
    interval: PropTypes.object.isRequired,
  };

  onChange = e => {
    const interval = optionValueToInterval(e.target.value);
    interval$.next(interval);
  };

  render() {
    return (
      <EuiSelect
        options={OPTIONS}
        className="ml-select-interval"
        value={this.props.interval.val}
        onChange={this.onChange}
      />
    );
  }
}

const SelectInterval = injectObservablesAsProps({ interval: interval$ }, SelectIntervalUnwrapped);

export { SelectInterval };
