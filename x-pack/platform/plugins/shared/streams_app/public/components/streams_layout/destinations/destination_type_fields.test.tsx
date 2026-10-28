/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestinationTypeFields } from './destination_type_fields';
import {
  EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  EMPTY_S3_DESTINATION_FORM,
  type DestinationStorageKind,
  type RemoteElasticsearchDestinationFormData,
} from './types';

const API_KEY_VALUE = 'remote-key-value-1';
const REMOTE_INDEX = 'remote-idx';

const renderTypeFields = (
  storageKind: DestinationStorageKind,
  remoteElasticsearchForm: Partial<RemoteElasticsearchDestinationFormData> = {}
) => {
  const onAutoChange = jest.fn();
  const onIndexesChange = jest.fn();
  const onRemoteElasticsearchChange = jest.fn();
  const result = render(
    <DestinationTypeFields
      storageKind={storageKind}
      auto={false}
      logsIndex="logs-local-x"
      metricsIndex="metrics-local-x"
      tracesIndex="traces-local-x"
      disabled={false}
      onAutoChange={onAutoChange}
      onIndexesChange={onIndexesChange}
      s3Form={EMPTY_S3_DESTINATION_FORM}
      s3Errors={{}}
      onS3Change={jest.fn()}
      remoteElasticsearchForm={{
        ...EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
        endpoint: 'https://remote.example.com',
        apiKey: API_KEY_VALUE,
        ...remoteElasticsearchForm,
      }}
      remoteElasticsearchErrors={{}}
      onRemoteElasticsearchChange={onRemoteElasticsearchChange}
      onBlur={jest.fn()}
    />
  );
  return { ...result, onAutoChange, onIndexesChange, onRemoteElasticsearchChange };
};

describe('DestinationTypeFields', () => {
  it('sends remote routing and connection changes to the remote slice only', async () => {
    const { onAutoChange, onIndexesChange, onRemoteElasticsearchChange } = renderTypeFields(
      'remote_elasticsearch',
      {
        auto: false,
        logsIndex: REMOTE_INDEX,
        metricsIndex: REMOTE_INDEX,
        tracesIndex: REMOTE_INDEX,
      }
    );

    const indexField = screen.getByTestId('streamsCreateDestinationIndex');
    expect(indexField).toHaveValue(REMOTE_INDEX);

    fireEvent.change(indexField, { target: { value: 'remote-idx-2' } });
    expect(onRemoteElasticsearchChange).toHaveBeenLastCalledWith({
      logsIndex: 'remote-idx-2',
      metricsIndex: 'remote-idx-2',
      tracesIndex: 'remote-idx-2',
    });

    await userEvent.click(screen.getByLabelText('Auto'));
    expect(onRemoteElasticsearchChange).toHaveBeenCalledWith({ auto: true });
    expect(onRemoteElasticsearchChange).toHaveBeenLastCalledWith({
      logsIndex: '',
      metricsIndex: '',
      tracesIndex: '',
    });

    fireEvent.change(screen.getByTestId('streamsCreateDestinationRemoteElasticsearchEndpoint'), {
      target: { value: 'https://other.example.com' },
    });
    expect(onRemoteElasticsearchChange).toHaveBeenLastCalledWith({
      endpoint: 'https://other.example.com',
    });

    expect(onAutoChange).not.toHaveBeenCalled();
    expect(onIndexesChange).not.toHaveBeenCalled();
  });

  it('keeps the local fields for local Elasticsearch', () => {
    renderTypeFields('local_elasticsearch');

    expect(screen.queryByTestId('streamsCreateDestinationRemoteElasticsearchEndpoint')).toBeNull();
    expect(screen.getByLabelText('Fixed index per signal')).toBeChecked();
    expect(screen.getByText('logs / metrics / traces')).toBeInTheDocument();
    expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveValue('local-x');
  });
});
