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
import type { DestinationCreationFormErrors, DestinationStorageKind } from './types';

interface DestinationTypeStepsProps {
  storageKind: DestinationStorageKind;
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

/** Modal steps for the selected destination type. Fields bind through the surrounding `FormProvider`. */
export const getDestinationTypeSteps = ({
  storageKind,
  errors,
  disabled,
}: DestinationTypeStepsProps): EuiStepsProps['steps'] => {
  switch (storageKind) {
    case 'local_elasticsearch':
      return [
        {
          title: WRITING_MODE_STEP_TITLE,
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
          children: <RemoteElasticsearchConnectionFields errors={errors} disabled={disabled} />,
        },
        {
          title: WRITING_MODE_STEP_TITLE,
          children: <RemoteElasticsearchRoutingFields errors={errors} disabled={disabled} />,
        },
      ];
    case 'external_storage':
      return [
        {
          title: i18n.translate('xpack.streams.destinations.externalStorageStepTitle', {
            defaultMessage: 'Configure external storage',
          }),
          children: <S3Fields errors={errors} disabled={disabled} />,
        },
      ];
  }
};
