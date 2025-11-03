/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { InfinityIconSvg } from './infinity_icon.svg';

export const InfinityIcon: FunctionComponent<Omit<EuiIconProps, 'type'>> = (props) => (
  <EuiIcon type={InfinityIconSvg} {...props} />
);
