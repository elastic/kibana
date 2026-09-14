/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldType } from '../../../../common/types/domain/template/fields';
import * as i18n from '../translations';

/**
 * Human-readable label for each field control, keyed by its `control` constant. Used both for
 * autocomplete branch titles in the generated JSON Schema and for user-facing validation messages.
 */
export const FIELD_TYPE_TITLES: Record<string, string> = {
  [FieldType.INPUT_TEXT]: i18n.FIELD_TYPE_TITLE_INPUT_TEXT,
  [FieldType.INPUT_NUMBER]: i18n.FIELD_TYPE_TITLE_INPUT_NUMBER,
  [FieldType.SELECT_BASIC]: i18n.FIELD_TYPE_TITLE_SELECT_BASIC,
  [FieldType.TEXTAREA]: i18n.FIELD_TYPE_TITLE_TEXTAREA,
  [FieldType.DATE_PICKER]: i18n.FIELD_TYPE_TITLE_DATE_PICKER,
  [FieldType.TOGGLE]: i18n.FIELD_TYPE_TITLE_TOGGLE,
  [FieldType.CHECKBOX_GROUP]: i18n.FIELD_TYPE_TITLE_CHECKBOX_GROUP,
  [FieldType.RADIO_GROUP]: i18n.FIELD_TYPE_TITLE_RADIO_GROUP,
  [FieldType.USER_PICKER]: i18n.FIELD_TYPE_TITLE_USER_PICKER,
  [FieldType.MARKDOWN]: i18n.FIELD_TYPE_TITLE_MARKDOWN,
};
