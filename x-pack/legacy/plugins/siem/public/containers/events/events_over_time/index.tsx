/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';

import { State, inputsSelectors } from '../../../store';
import { MatrixHistogram } from '../../matrix_histogram';
import { useQuery as useMatrixHistogramQuery } from '../../matrix_histogram/utils';
import { MatrixHistogramProps } from '../../matrix_histogram/types';

export interface EventsOverTimeComponentReduxProps {
  isInspected: boolean;
}

type EventsOverTimeProps = MatrixHistogramProps;

const makeMapStateToProps = () => {
  const getQuery = inputsSelectors.globalQueryByIdSelector();
  const mapStateToProps = (state: State, { type, id }: EventsOverTimeProps) => {
    const { isInspected } = getQuery(state, id);
    return {
      isInspected,
    };
  };
  return mapStateToProps;
};

export const EventsOverTimeQuery = compose<React.ComponentClass<EventsOverTimeProps>>(
  connect(makeMapStateToProps)
)(MatrixHistogram);
