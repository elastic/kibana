/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldType } from '../../../../common/types/domain/template/fields';
import * as i18n from '../translations';
import { FIELD_TYPE_TITLES } from './field_type_titles';

/**
 * A yaml-language-server `defaultSnippets` entry: a labeled, ready-to-edit template that the editor
 * offers as a completion. `body` is serialized to YAML with `${n:placeholder}` tab stops the author
 * tabs through. See jsonSchema.d.ts in yaml-language-server.
 */
export interface DefaultSnippet {
  label: string;
  description?: string;
  body: unknown;
}

// Shared leading tab stops so `name`/`label` are the first things an author fills in.
const NAME = '${1:field_name}';
const LABEL = '${2:Label}';

/**
 * One snippet per field control plus a `$ref` library reference. Each body mirrors the minimal,
 * valid shape from the field catalog (correct `control`, `type`, and the required `metadata` for
 * that control), so choosing a field type from autocomplete scaffolds a correct entry without the
 * author needing to recall the exact keys from the documentation.
 */
export const FIELD_DEFAULT_SNIPPETS: DefaultSnippet[] = [
  {
    label: FIELD_TYPE_TITLES[FieldType.INPUT_TEXT],
    description: i18n.FIELD_SNIPPET_DESC_INPUT_TEXT,
    body: { name: NAME, label: LABEL, control: FieldType.INPUT_TEXT, type: 'keyword' },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.INPUT_NUMBER],
    description: i18n.FIELD_SNIPPET_DESC_INPUT_NUMBER,
    body: { name: NAME, label: LABEL, control: FieldType.INPUT_NUMBER, type: '${3:integer}' },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.TEXTAREA],
    description: i18n.FIELD_SNIPPET_DESC_TEXTAREA,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.TEXTAREA,
      type: 'keyword',
      metadata: { markdown: false },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.SELECT_BASIC],
    description: i18n.FIELD_SNIPPET_DESC_SELECT_BASIC,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.SELECT_BASIC,
      type: 'keyword',
      metadata: { options: ['${3:option_1}', '${4:option_2}'] },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.RADIO_GROUP],
    description: i18n.FIELD_SNIPPET_DESC_RADIO_GROUP,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.RADIO_GROUP,
      type: 'keyword',
      metadata: { options: ['${3:option_1}', '${4:option_2}'] },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.CHECKBOX_GROUP],
    description: i18n.FIELD_SNIPPET_DESC_CHECKBOX_GROUP,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.CHECKBOX_GROUP,
      type: 'keyword',
      metadata: { options: ['${3:option_1}', '${4:option_2}'] },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.DATE_PICKER],
    description: i18n.FIELD_SNIPPET_DESC_DATE_PICKER,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.DATE_PICKER,
      type: 'date',
      metadata: { show_time: false, timezone: '${3:utc}' },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.TOGGLE],
    description: i18n.FIELD_SNIPPET_DESC_TOGGLE,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.TOGGLE,
      type: 'boolean',
      metadata: { default: false },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.USER_PICKER],
    description: i18n.FIELD_SNIPPET_DESC_USER_PICKER,
    body: {
      name: NAME,
      label: LABEL,
      control: FieldType.USER_PICKER,
      type: 'keyword',
      metadata: { multiple: true },
    },
  },
  {
    label: FIELD_TYPE_TITLES[FieldType.MARKDOWN],
    description: i18n.FIELD_SNIPPET_DESC_MARKDOWN,
    body: {
      name: '${1:instructions}',
      control: FieldType.MARKDOWN,
      metadata: { content: '${2:### Instructions}' },
    },
  },
  {
    label: i18n.FIELD_SNIPPET_LABEL_REF,
    description: i18n.FIELD_SNIPPET_DESC_REF,
    body: { $ref: '${1:library_field_name}' },
  },
];

/** A single assignee entry (`- uid: ...`) offered when adding to the `assignees` list. */
export const ASSIGNEE_DEFAULT_SNIPPETS: DefaultSnippet[] = [
  {
    label: 'uid',
    description: i18n.ASSIGNEE_SNIPPET_DESC,
    body: { uid: '${1:u_profile_id}' },
  },
];
