/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiStepsProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { WRITING_MODE_STEP_TITLE } from './destination_type_config';
import { LocalElasticsearchFields } from './local_elasticsearch_fields';
import { RemoteElasticsearchConnectionFields } from './remote_elasticsearch_connection_fields';
import { RemoteElasticsearchRoutingFields } from './remote_elasticsearch_routing_fields';
import { S3Fields } from './s3_fields';
import type {
  DestinationCreationFormErrors,
  DestinationCreationFormField,
  DestinationStorageKind,
} from './types';

type StepStatus = EuiStepsProps['steps'][number]['status'];

/** Hollow dot while any of the step's fields has an error, filled otherwise. */
export const getStepStatus = (
  errors: DestinationCreationFormErrors,
  fields: readonly DestinationCreationFormField[]
): StepStatus => (fields.some((field) => errors[field]) ? 'incomplete' : undefined);

const SIGNAL_INDEX_ERROR_FIELDS = [
  'staticIndexes',
  'logsIndex',
  'metricsIndex',
  'tracesIndex',
] as const;
const LOCAL_WRITING_MODE_FIELDS = [
  ...SIGNAL_INDEX_ERROR_FIELDS,
  'customSignals',
  'docsIndex',
  'docsWritePatterns',
] as const;
const REMOTE_CONNECTION_FIELDS = ['endpoint', 'apiKey'] as const;
const S3_FIELDS = ['region', 'bucket', 'accessKeyId', 'secretAccessKey'] as const;

interface DestinationTypeStepsProps {
  storageKind: DestinationStorageKind;
  errors: DestinationCreationFormErrors;
  /** All current errors, including ones not shown yet. */
  stepErrors: DestinationCreationFormErrors;
  disabled: boolean;
}

/**
 * Returns the modal steps for the selected destination type.
 * Add a case and its fields when a new type becomes available.
 * Fields read and write their values through the surrounding `FormProvider`.
 */
export const getDestinationTypeSteps = ({
  storageKind,
  errors,
  stepErrors,
  disabled,
}: DestinationTypeStepsProps): EuiStepsProps['steps'] => {
  switch (storageKind) {
    case 'local_elasticsearch':
      return [
        {
          title: WRITING_MODE_STEP_TITLE,
          status: getStepStatus(stepErrors, LOCAL_WRITING_MODE_FIELDS),
          children: <LocalElasticsearchFields errors={errors} disabled={disabled} />,
        },
      ];
    case 'remote_elasticsearch':
      return [
        {
          title: i18n.translate(
            'xpack.streams.destinations.remoteElasticsearch.connectionStepTitle',
            { defaultMessage: 'Connect your remote cluster' }
          ),
          status: getStepStatus(stepErrors, REMOTE_CONNECTION_FIELDS),
          children: <RemoteElasticsearchConnectionFields errors={errors} disabled={disabled} />,
        },
        {
          title: WRITING_MODE_STEP_TITLE,
          status: getStepStatus(stepErrors, SIGNAL_INDEX_ERROR_FIELDS),
          children: <RemoteElasticsearchRoutingFields errors={errors} disabled={disabled} />,
        },
      ];
    case 'external_storage':
      return [
        {
          title: i18n.translate('xpack.streams.destinations.externalStorageStepTitle', {
            defaultMessage: 'Configure external storage',
          }),
          status: getStepStatus(stepErrors, S3_FIELDS),
          children: <S3Fields errors={errors} disabled={disabled} />,
        },
      ];
  }
};
