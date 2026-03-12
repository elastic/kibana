/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React from 'react';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { type InputTextFieldSchema } from '../../../../../common/types/domain/template/fields';

type InputTextProps = z.infer<typeof InputTextFieldSchema>;

export const InputText: React.FC<InputTextProps> = ({ label, name, type }) => {
  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${name}_as_${type}`}
      component={TextField}
      componentProps={{
        label,
      }}
    />
  );
};
InputText.displayName = 'InputText';
