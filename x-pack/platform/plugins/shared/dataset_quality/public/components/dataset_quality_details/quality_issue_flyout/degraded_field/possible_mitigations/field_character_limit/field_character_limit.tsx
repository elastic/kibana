/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { StreamsAppLocatorParams } from '@kbn/streams-app-plugin/common/locators/streams_locator';
import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { useKibanaContextForPlugin } from '../../../../../../utils';
import { useDatasetQualityDetailsState } from '../../../../../../hooks';
import { ModifyFieldValue } from './modify_field_value';
import { IncreaseFieldCharacterLimit } from './Increase_field_character_limit';

export const FieldCharacterLimit = () => {
  const {
    loadingState: { integrationDetailsLoaded },
    datasetDetails,
  } = useDatasetQualityDetailsState();

  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const streamsLocator = locators.get<StreamsAppLocatorParams>(STREAMS_APP_LOCATOR_ID);

  return (
    <>
      <ModifyFieldValue
        isLoading={!integrationDetailsLoaded}
        datasetDetails={datasetDetails}
        streamsLocator={streamsLocator}
      />
      <EuiSpacer size="m" />
      <IncreaseFieldCharacterLimit
        isLoading={!integrationDetailsLoaded}
        datasetDetails={datasetDetails}
        streamsLocator={streamsLocator}
      />
      <EuiSpacer size="m" />
    </>
  );
};
