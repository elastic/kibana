/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { z } from '@kbn/zod/v4';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { CASE_EXTENDED_FIELDS } from '../../../../../common/constants';
import { getFieldSnakeKey } from '../../../../../common/utils';
import type {
  SelectBasicFieldSchema,
  ConditionRenderProps,
} from '../../../../../common/types/domain/template/fields';
import { FIELD_REQUIRED } from '../../translations';
import { OptionalFieldLabel } from '../../../optional_field_label';

const { emptyField } = fieldValidators;

type SelectBasicProps = z.infer<typeof SelectBasicFieldSchema> & ConditionRenderProps;

export const SelectBasic = ({ label, metadata, name, type, isRequired }: SelectBasicProps) => {
  const validations = [];

  if (isRequired) {
    validations.push({ validator: emptyField(FIELD_REQUIRED) });
  }

  return (
    <UseField
      key={name}
      path={`${CASE_EXTENDED_FIELDS}.${getFieldSnakeKey(name, type)}`}
      component={SelectField}
      config={{ validations }}
      componentProps={{
        label,
        labelAppend: !isRequired ? OptionalFieldLabel : undefined,
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
