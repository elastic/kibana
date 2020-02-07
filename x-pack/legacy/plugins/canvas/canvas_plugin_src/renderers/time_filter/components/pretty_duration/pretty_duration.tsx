/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { formatDuration } from './lib/format_duration';

interface Props {
  /** Initial start date string */
  from: string;
  /** Initial end date string */
  to: string;
}

export const PrettyDuration: FunctionComponent<Props> = ({ from, to }) => (
  <span>{formatDuration(from, to)}</span>
);

PrettyDuration.propTypes = {
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};
