/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';
import { compose, withState, lifecycle } from 'recompose';
import { DatetimeInput as Component, Props as ComponentProps } from './datetime_input';

export interface Props {
  /** Input value (Moment date object) */
  moment?: Moment;
  /** Function to invoke when the input changes */
  setMoment: (m: Moment) => void;
}

export const DatetimeInput = compose<ComponentProps, Props>(
  withState('valid', 'setValid', () => true),
  withState('strValue', 'setStrValue', ({ moment }) =>
    moment ? moment.format('YYYY-MM-DD HH:mm:ss') : ''
  ),
  lifecycle<Props & ComponentProps, {}>({
    // TODO: Refactor to no longer use componentWillReceiveProps since it is being deprecated
    componentWillReceiveProps({ moment, setStrValue, setValid }) {
      if (!moment) return;

      if (this.props.moment && this.props.moment.isSame(moment)) {
        return;
      }
      setStrValue(moment.format('YYYY-MM-DD HH:mm:ss'));
      setValid(true);
    },
  })
)(Component);
