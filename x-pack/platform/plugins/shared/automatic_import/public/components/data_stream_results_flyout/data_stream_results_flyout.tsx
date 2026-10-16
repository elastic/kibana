/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UIStateProvider } from '../integration_management/contexts';
import { EditPipelineFlyout } from '../integration_management/management_contents/data_streams/edit_pipeline_flyout';
import { useGetIntegrationById } from '../../common';
import { getFieldTypeEditState } from '../../../common';
import type { DataStreamResultsFlyoutProps } from './types';

const DataStreamResultsFlyoutContent = ({
  integrationId,
  dataStream,
  onClose,
}: DataStreamResultsFlyoutProps) => {
  const {
    integration,
    isLoading: isIntegrationLoading,
    isError: isIntegrationError,
  } = useGetIntegrationById(integrationId);
  const fieldTypeEditState = getFieldTypeEditState({
    integration,
    dataStream,
    isLoading: isIntegrationLoading,
    isError: isIntegrationError,
  });

  return (
    <EditPipelineFlyout
      integrationId={integrationId}
      dataStream={dataStream}
      onClose={onClose}
      fieldTypeEditState={fieldTypeEditState}
    />
  );
};

export const DataStreamResultsFlyout = (props: DataStreamResultsFlyoutProps) => {
  return (
    <UIStateProvider>
      <DataStreamResultsFlyoutContent {...props} />
    </UIStateProvider>
  );
};
