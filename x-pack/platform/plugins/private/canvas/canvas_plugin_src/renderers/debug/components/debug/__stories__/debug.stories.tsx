/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Debug } from '../debug';
import { largePayload, smallPayload } from './helpers';

export default {
  title: 'components/Elements/Debug',
};

export const SmallPayload = {
  render: () => <Debug payload={smallPayload} />,
  name: 'small payload',
};

export const LargePayload = {
  render: () => <Debug payload={largePayload} />,
  name: 'large payload',
};
