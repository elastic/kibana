/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState, lifecycle } from 'recompose';
import { DatetimeInput as Component } from './datetime_input';

export const DatetimeInput = compose(
  withState('valid', 'setValid', () => true),
  withState('strValue', 'setStrValue', ({ moment }) => moment.format('YYYY-MM-DD HH:mm:ss')),
  lifecycle({
    componentWillReceiveProps({ moment, setStrValue, setValid }) {
      if (this.props.moment.isSame(moment)) {
        return;
      }
      setStrValue(moment.format('YYYY-MM-DD HH:mm:ss'));
      setValid(true);
    },
  })
)(Component);
