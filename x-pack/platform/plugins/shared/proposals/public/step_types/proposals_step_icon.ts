/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React from 'react';

/** The icon shared by every proposals step in the workflow editor. */
export const ProposalsStepIcon: ComponentType = React.lazy(() =>
  import('@elastic/eui/es/components/icon/assets/pages_select').then(({ icon }) => ({
    default: icon,
  }))
);
