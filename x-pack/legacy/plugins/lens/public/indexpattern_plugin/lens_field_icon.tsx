/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import classNames from 'classnames';
import { FieldIcon } from '../../../../../../src/plugins/kibana_react/public';
import { DataType } from '../types';

export function LensFieldIcon({ type }: { type: DataType }) {
  const classes = classNames(
    'lnsFieldListPanel__fieldIcon',
    `lnsFieldListPanel__fieldIcon--${type}`
  );

  return <FieldIcon type={type} className={classes} size={'m'} useColor />;
}
