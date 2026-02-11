/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type { SelectBasicFieldSchema } from '../../../../../common/types/domain/template/fields';

export const SelectBasic = ({
  label,
  metadata,
  name,
  type,
}: z.infer<typeof SelectBasicFieldSchema>) => {
  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      component={SelectField}
      componentProps={{
        label,
        euiFieldProps: {
          options: metadata.options.map((option) => ({
            value: option,
            text: option,
          })),
        },
      }}
    />
  );
};
SelectBasic.displayName = 'SelectBasic';
