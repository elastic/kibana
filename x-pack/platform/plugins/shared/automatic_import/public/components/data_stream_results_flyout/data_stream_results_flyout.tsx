/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UIStateProvider } from '../integration_management/contexts';
import { EditPipelineFlyout } from '../integration_management/management_contents/data_streams/edit_pipeline_flyout';
import type { DataStreamResultsFlyoutProps } from './types';

export const DataStreamResultsFlyout = ({
  integrationId,
  dataStream,
  onClose,
}: DataStreamResultsFlyoutProps) => {
  return (
    <UIStateProvider>
      <EditPipelineFlyout integrationId={integrationId} dataStream={dataStream} onClose={onClose} />
    </UIStateProvider>
  );
};
