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
    componentDidUpdate(prevProps) {
      const prevMoment = prevProps.moment;

      // If we don't have a current moment, do nothing
      if (!this.props.moment) return;

      // If we previously had a moment and it's the same as the current moment, do nothing
      if (prevMoment && prevMoment.isSame(this.props.moment)) {
        return;
      }

      // Set the string value of the current moment and mark as valid
      this.props.setStrValue(this.props.moment.format('YYYY-MM-DD HH:mm:ss'));
      this.props.setValid(true);
    },
  })
)(Component);
