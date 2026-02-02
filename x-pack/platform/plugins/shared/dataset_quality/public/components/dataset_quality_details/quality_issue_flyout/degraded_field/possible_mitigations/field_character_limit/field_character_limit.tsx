/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useDatasetQualityDetailsState } from '../../../../../../hooks';
import { ModifyFieldValue } from './modify_field_value';
import { IncreaseFieldCharacterLimit } from './Increase_field_character_limit';

export const FieldCharacterLimit = () => {
  const {
    loadingState: { integrationDetailsLoaded },
    streamsUrls,
  } = useDatasetQualityDetailsState();

  return (
    <>
      <ModifyFieldValue
        isLoading={!integrationDetailsLoaded}
        processingUrl={streamsUrls?.processingUrl}
      />
      <EuiSpacer size="m" />
      <IncreaseFieldCharacterLimit
        isLoading={!integrationDetailsLoaded}
        schemaUrl={streamsUrls?.schemaUrl}
      />
      <EuiSpacer size="m" />
    </>
  );
};
