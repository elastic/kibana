/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ConfigEntryView } from '../../types/types';
import { getNonEmptyValidator } from '../../utils/helpers';

interface ProviderSecretHiddenFieldProps {
  requiredProviderFormFields: ConfigEntryView[];
  setRequiredProviderFormFields: React.Dispatch<React.SetStateAction<ConfigEntryView[]>>;
  isSubmitting: boolean;
}

export const ProviderSecretHiddenField: React.FC<ProviderSecretHiddenFieldProps> = ({
  requiredProviderFormFields,
  setRequiredProviderFormFields,
  isSubmitting,
}) => (
  <UseField
    path="secrets.providerSecrets"
    component={HiddenField}
    config={{
      validations: [
        {
          validator: getNonEmptyValidator(
            requiredProviderFormFields,
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
