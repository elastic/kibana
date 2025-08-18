/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import React from 'react';
import type { ConfigEntryView } from '../../types/types';
import { getNonEmptyValidator } from '../../utils/helpers';

interface ProviderConfigHiddenFieldProps {
  requiredProviderFormFields: ConfigEntryView[];
  setRequiredProviderFormFields: React.Dispatch<React.SetStateAction<ConfigEntryView[]>>;
  isSubmitting: boolean;
}

export const ProviderConfigHiddenField: React.FC<ProviderConfigHiddenFieldProps> = ({
  requiredProviderFormFields,
  setRequiredProviderFormFields,
  isSubmitting,
}) => (
  <UseField
    path="config.providerConfig"
    component={HiddenField}
    config={{
      validations: [
        {
          validator: getNonEmptyValidator(
            requiredProviderFormFields,
            setRequiredProviderFormFields,
            isSubmitting
          ),
          isBlocking: true,
        },
      ],
    }}
  />
);
