/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { VALIDATION_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CasePostRequest } from '../../../common';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../common/constants';
import { SEVERITY_TITLE } from '../severity/translations';
import type { ConnectorTypeFields } from '../../../common/types/domain';
import * as i18n from './translations';
import { validateEmptyTags, validateMaxLength, validateMaxTagsLength } from './utils';
import { OptionalFieldLabel } from '../optional_field_label';

const { maxLengthField } = fieldValidators;

export type CaseFormFieldsSchemaProps = Omit<
  CasePostRequest,
  'connector' | 'settings' | 'owner' | 'customFields'
> & {
  connectorId: string;
  fields: ConnectorTypeFields['fields'];
  syncAlerts: boolean;
  customFields: Record<string, string | boolean>;
};

export const schema: FormSchema<CaseFormFieldsSchemaProps> = {
  title: {
    label: i18n.NAME,
    validations: [
      {
        validator: maxLengthField({
          length: MAX_TITLE_LENGTH,
          message: i18n.MAX_LENGTH_ERROR('name', MAX_TITLE_LENGTH),
        }),
      },
    ],
  },
  description: {
    label: i18n.DESCRIPTION,
    validations: [
      {
        validator: maxLengthField({
          length: MAX_DESCRIPTION_LENGTH,
          message: i18n.MAX_LENGTH_ERROR('description', MAX_DESCRIPTION_LENGTH),
        }),
      },
    ],
  },
  tags: {
    label: i18n.TAGS,
    helpText: i18n.TAGS_HELP,
    labelAppend: OptionalFieldLabel,
    validations: [
      {
        validator: ({ value }: { value: string | string[] }) =>
          validateEmptyTags({ value, message: i18n.TAGS_EMPTY_ERROR }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
        isBlocking: false,
      },
      {
        validator: ({ value }: { value: string | string[] }) =>
          validateMaxLength({
            value,
            message: i18n.MAX_LENGTH_ERROR('tag', MAX_LENGTH_PER_TAG),
            limit: MAX_LENGTH_PER_TAG,
          }),
        type: VALIDATION_TYPES.ARRAY_ITEM,
        isBlocking: false,
      },
      {
        validator: ({ value }: { value: string[] }) =>
          validateMaxTagsLength({
            value,
            message: i18n.MAX_TAGS_ERROR(MAX_TAGS_PER_CASE),
            limit: MAX_TAGS_PER_CASE,
          }),
      },
    ],
  },
  severity: {
    label: SEVERITY_TITLE,
  },
  assignees: { labelAppend: OptionalFieldLabel },
  category: {
    labelAppend: OptionalFieldLabel,
  },
  syncAlerts: {
    helpText: i18n.SYNC_ALERTS_HELP,
    defaultValue: true,
  },
  customFields: {},
  connectorId: {
    label: i18n.CONNECTORS,
    defaultValue: 'none',
    labelAppend: OptionalFieldLabel,
  },
  fields: {
    defaultValue: null,
  },
};
