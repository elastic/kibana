/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConfigEntryView } from '@kbn/inference-endpoint-ui-common';
import { getNonEmptyValidator } from './helpers';

export const getProviderSecretsHiddenField = (
  providerSchema: ConfigEntryView[],
  setRequiredProviderFormFields: React.Dispatch<React.SetStateAction<ConfigEntryView[]>>,
  isSubmitting: boolean
) => (
  <UseField
    path="secrets.providerSecrets"
    component={HiddenField}
    config={{
      validations: [
        {
          validator: getNonEmptyValidator(
            providerSchema,
            setRequiredProviderFormFields,
            isSubmitting,
            true
          ),
          isBlocking: true,
        },
      ],
    }}
  />
);

export const getProviderConfigHiddenField = (
  providerSchema: ConfigEntryView[],
  setRequiredProviderFormFields: React.Dispatch<React.SetStateAction<ConfigEntryView[]>>,
  isSubmitting: boolean
) => (
  <UseField
    path="config.providerConfig"
    component={HiddenField}
    config={{
      validations: [
        {
          validator: getNonEmptyValidator(
            providerSchema,
            setRequiredProviderFormFields,
            isSubmitting
          ),
          isBlocking: true,
        },
      ],
    }}
  />
);
