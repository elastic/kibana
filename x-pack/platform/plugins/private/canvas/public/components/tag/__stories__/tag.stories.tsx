/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Tag } from '../tag';

export default {
  title: 'components/Tags/Tag',
};

export const AsHealth = {
  render: () => <Tag name="tag" />,
  name: 'as health',
};

export const AsHealthWithColor = {
  render: () => <Tag name="tag" color="#9b3067" />,
  name: 'as health with color',
};

export const AsBadge = {
  render: () => <Tag name="tag" type="badge" />,
  name: 'as badge',
};

export const AsBadgeWithColor = {
  render: () => <Tag name="tag" type="badge" color="#327b53" />,
  name: 'as badge with color',
};
