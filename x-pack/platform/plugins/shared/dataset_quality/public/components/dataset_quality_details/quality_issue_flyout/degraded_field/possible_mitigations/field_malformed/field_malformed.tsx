/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useDatasetQualityDetailsState } from '../../../../../../hooks';
import { CreateConvertProcessor } from './create_convert_processor';
import { ChangeFieldTypeInSchema } from './change_field_type_in_schema';

export const FieldMalformed = () => {
  const {
    loadingState: { integrationDetailsLoaded },
    streamsUrls,
  } = useDatasetQualityDetailsState();

  return (
    <>
      <CreateConvertProcessor
        isLoading={!integrationDetailsLoaded}
        processingUrl={streamsUrls?.processingUrl}
      />
      <EuiSpacer size="m" />
      <ChangeFieldTypeInSchema
        isLoading={!integrationDetailsLoaded}
        schemaUrl={streamsUrls?.schemaUrl}
      />
      <EuiSpacer size="m" />
    </>
  );
};
