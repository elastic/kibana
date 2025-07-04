/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldConfig, FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import * as i18n from './translations';

const { emptyField } = fieldValidators;
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
import { schema as caseFormFieldsSchema } from '../case_form_fields/schema';

const caseFormFieldsSchemaTyped = caseFormFieldsSchema as Record<string, FieldConfig<string>>;

export const schema: FormSchema<CaseFormFieldsSchemaProps> = {
  ...caseFormFieldsSchema,
  title: {
    ...caseFormFieldsSchemaTyped.title,
    validations: [
      {
        validator: emptyField(i18n.TITLE_REQUIRED),
      },
      ...(caseFormFieldsSchemaTyped.title.validations ?? []),
    ],
  },
  description: {
    ...caseFormFieldsSchemaTyped.description,
    validations: [
      {
        validator: emptyField(i18n.DESCRIPTION_REQUIRED),
      },
      ...(caseFormFieldsSchemaTyped.description.validations ?? []),
    ],
  },
};
