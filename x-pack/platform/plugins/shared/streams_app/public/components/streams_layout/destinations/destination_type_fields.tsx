/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LocalElasticsearchFields } from './local_elasticsearch_fields';
import { S3Fields } from './s3_fields';
import type { DestinationCreationFormErrors, DestinationStorageKind } from './types';

interface DestinationTypeFieldsProps {
  storageKind: DestinationStorageKind;
  errors: DestinationCreationFormErrors;
  disabled: boolean;
}

/**
 * Renders the form section for the selected destination type.
 * Add a case and a fields component when a new type becomes available.
 * Fields read and write their values through the surrounding `FormProvider`.
 */
export const DestinationTypeFields = ({
  storageKind,
  errors,
  disabled,
}: DestinationTypeFieldsProps) => {
  switch (storageKind) {
    case 'local_elasticsearch':
      return <LocalElasticsearchFields errors={errors} disabled={disabled} />;
    case 'external_storage':
      return <S3Fields errors={errors} disabled={disabled} />;
  }
};
