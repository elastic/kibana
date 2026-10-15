/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LocalElasticsearchFields } from './local_elasticsearch_fields';
import { S3Fields } from './s3_fields';
import type {
  DestinationCreationFormErrors,
  DestinationStorageKind,
  S3DestinationFormData,
  S3DestinationFormErrors,
} from './types';

interface DestinationTypeFieldsProps {
  storageKind: DestinationStorageKind;
  index: string;
  indexPatterns: string;
  indexError?: DestinationCreationFormErrors['index'];
  indexPatternsError?: DestinationCreationFormErrors['indexPatterns'];
  s3Form: S3DestinationFormData;
  s3Errors: S3DestinationFormErrors;
  disabled: boolean;
  onIndexChange: (index: string) => void;
  onIndexPatternsChange: (indexPatterns: string) => void;
  onS3Change: (changes: Partial<S3DestinationFormData>) => void;
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
  ...fields
}: DestinationTypeFieldsProps) => {
  switch (storageKind) {
    case 'local_elasticsearch':
      return <LocalElasticsearchFields {...fields} />;
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
