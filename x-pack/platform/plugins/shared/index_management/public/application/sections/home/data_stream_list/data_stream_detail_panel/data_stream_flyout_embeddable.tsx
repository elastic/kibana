/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import { ComponentType } from 'react';
import { DataStreamFlyoutWithContextProps } from './data_stream_flyout_with_context_types';

export const DataStreamFlyout = dynamic<ComponentType<DataStreamFlyoutWithContextProps>>(() =>
  import('./data_stream_flyout_with_context').then((mod) => ({
    default: mod.DataStreamFlyoutWithContext,
  }))
);
