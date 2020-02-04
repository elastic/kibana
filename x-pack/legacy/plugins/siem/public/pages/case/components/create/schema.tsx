/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, FormSchema } from '../shared_imports';
import { OptionalFieldLabel } from './optional_field_label';

const { emptyField } = fieldValidators;

export const schema: FormSchema = {
  title: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.siem.case.createCase.fieldTitleLabel', {
      defaultMessage: 'Title',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.siem.case.createCase.titleFieldRequiredError', {
            defaultMessage: 'A title is required.',
          })
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.siem.case.createCase.descriptionFieldRequiredError', {
            defaultMessage: 'A description is required.',
          })
        ),
      },
    ],
  },
  case_type: {
    type: FIELD_TYPES.SUPER_SELECT,
    label: i18n.translate('xpack.siem.case.createCase.fieldSeverityLabel', {
      defaultMessage: 'Case Type',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.siem.case.createCase.caseTypeFieldRequiredError', {
            defaultMessage: 'A case type is required.',
          })
        ),
      },
    ],
  },
  tags: {
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.translate('xpack.siem.case.createCase.fieldTagsLabel', {
      defaultMessage: 'Tags',
    }),
    helpText: i18n.translate('xpack.siem.case.createCase.fieldTagsHelpText', {
      defaultMessage:
        'Type one or more custom identifying tags for this case. Press enter after each tag to begin a new one.',
    }),
    labelAppend: OptionalFieldLabel,
  },
};
