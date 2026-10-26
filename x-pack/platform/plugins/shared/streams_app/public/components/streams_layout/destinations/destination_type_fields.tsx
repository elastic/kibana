/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LocalElasticsearchFields } from './local_elasticsearch_fields';
import type {
  DestinationCreationFormErrors,
  DestinationStorageKind,
  ElasticsearchDestinationFormData,
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
  onBlur: () => void;
}

/**
 * Renders the form section for the selected destination type.
 * Add a case and a fields component when a new type becomes available.
 */
export const DestinationTypeFields = ({ storageKind, ...fields }: DestinationTypeFieldsProps) => {
  switch (storageKind) {
    case 'local_elasticsearch':
      return <LocalElasticsearchFields {...fields} />;
    case 'external_storage':
      return (
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.streams.destinations.externalStorageUnavailableDescription"
            defaultMessage="External storage isn't available yet."
          />
        </EuiText>
      );
  }
};
