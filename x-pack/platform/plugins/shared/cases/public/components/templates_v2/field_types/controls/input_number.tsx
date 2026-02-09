/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import type { InputNumberFieldSchema } from '../../../../../common/types/domain/template/fields';

export const InputNumber = (props: z.infer<typeof InputNumberFieldSchema>) => {
  return (
    <UseField
      key={props.name}
      path={`${CASE_EXTENDED_FIELDS}.${props.name}_as_${props.type}`}
      component={NumericField}
      componentProps={{
        label: props.label,
      }}
    />
  );
};
InputNumber.displayName = 'InputNumber';
