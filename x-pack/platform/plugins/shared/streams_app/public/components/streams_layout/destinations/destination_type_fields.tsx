/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { ElasticsearchRoutingFields } from './elasticsearch_routing_fields';
import { RemoteElasticsearchConnectionFields } from './remote_elasticsearch_connection_fields';
import { S3Fields } from './s3_fields';
import type {
  DestinationCreationFormErrors,
  DestinationStorageKind,
  ElasticsearchDestinationFormData,
  RemoteElasticsearchConnectionErrors,
  RemoteElasticsearchDestinationFormData,
  S3DestinationFormData,
  S3FieldsErrors,
} from './types';

interface DestinationTypeFieldsProps {
  storageKind: DestinationStorageKind;
  auto: boolean;
  logsIndex: string;
  metricsIndex: string;
  tracesIndex: string;
  staticIndexesError?: DestinationCreationFormErrors['staticIndexes'];
  logsIndexError?: DestinationCreationFormErrors['logsIndex'];
  metricsIndexError?: DestinationCreationFormErrors['metricsIndex'];
  tracesIndexError?: DestinationCreationFormErrors['tracesIndex'];
  disabled: boolean;
  onAutoChange: (auto: boolean) => void;
  onIndexesChange: (
    indexes: Partial<
      Pick<ElasticsearchDestinationFormData, 'logsIndex' | 'metricsIndex' | 'tracesIndex'>
    >
  ) => void;
  s3Form: S3DestinationFormData;
  s3Errors: S3FieldsErrors;
  onS3Change: (changes: Partial<S3DestinationFormData>) => void;
  remoteElasticsearchForm: RemoteElasticsearchDestinationFormData;
  remoteElasticsearchErrors: RemoteElasticsearchConnectionErrors;
  onRemoteElasticsearchChange: (changes: Partial<RemoteElasticsearchDestinationFormData>) => void;
  onBlur: () => void;
}

/**
 * Renders the form section for the selected destination type.
 * Add a case and a fields component when a new type becomes available.
 */
export const DestinationTypeFields = ({
  storageKind,
  s3Form,
  s3Errors,
  onS3Change,
  remoteElasticsearchForm,
  remoteElasticsearchErrors,
  onRemoteElasticsearchChange,
  ...fields
}: DestinationTypeFieldsProps) => {
  switch (storageKind) {
    case 'local_elasticsearch':
      return <ElasticsearchRoutingFields variant="local" {...fields} />;
    case 'remote_elasticsearch':
      return (
        <>
          <RemoteElasticsearchConnectionFields
            endpoint={remoteElasticsearchForm.endpoint}
            apiKey={remoteElasticsearchForm.apiKey}
            errors={remoteElasticsearchErrors}
            disabled={fields.disabled}
            onChange={onRemoteElasticsearchChange}
            onBlur={fields.onBlur}
          />
          <EuiSpacer size="m" />
          <ElasticsearchRoutingFields
            variant="remote"
            auto={remoteElasticsearchForm.auto}
            logsIndex={remoteElasticsearchForm.logsIndex}
            metricsIndex={remoteElasticsearchForm.metricsIndex}
            tracesIndex={remoteElasticsearchForm.tracesIndex}
            staticIndexesError={fields.staticIndexesError}
            logsIndexError={fields.logsIndexError}
            metricsIndexError={fields.metricsIndexError}
            tracesIndexError={fields.tracesIndexError}
            disabled={fields.disabled}
            onAutoChange={(auto) => onRemoteElasticsearchChange({ auto })}
            onIndexesChange={onRemoteElasticsearchChange}
            onBlur={fields.onBlur}
          />
        </>
      );
    case 'external_storage':
      return (
        <S3Fields
          values={s3Form}
          errors={s3Errors}
          disabled={fields.disabled}
          onChange={onS3Change}
          onBlur={fields.onBlur}
        />
      );
  }
};
