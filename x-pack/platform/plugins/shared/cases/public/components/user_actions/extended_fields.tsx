/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { camelCase, startCase } from 'lodash';
import type { SnakeToCamelCase } from '../../../common/types';
import type { ExtendedFieldsUserAction } from '../../../common/types/domain';
import type { CasesConfigurationUI } from '../../../common/ui';
import type { CaseUI } from '../../../common/ui/types';
import { getFieldCamelKey, getV2FieldType } from '../../../common/utils/template_fields';
import { getExtendedFieldDisplayValue } from '../all_cases/extended_field_columns';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { ScrollableMarkdown } from '../markdown_editor';
import { PreferenceFormattedDate } from '../formatted_date';
import * as i18n from './translations';
import { getMaybeDate } from '../formatted_date/maybe_date';

const getFieldDisplayName = (key: string): string => {
  // The key arrives as camelCase (e.g. "riskScoreAsKeyword") because convertToCamelCase
  // runs recursively over all payload keys. Strip the "As<Type>" suffix that template
  // fields append (fieldKey = `${field.name}_as_${field.type}`).
  const withoutTypeSuffix = key.replace(/As[A-Z][a-zA-Z0-9]*$/, '');
  return startCase(withoutTypeSuffix);
};

// Payload keys arrive camelCased (e.g. "newFieldAsKeyword"); this maps each back to its
// human-readable label so the activity reads correctly instead of startCase(key).
// Sources, in increasing priority:
//  1. Migrated legacy custom fields (uuid-based keys) from the configuration.
//  2. The case's server-enriched `extendedFieldsLabels` (covers template + global fields,
//     keyed by snake storage key e.g. `new_field_as_keyword`), which wins on conflict.
const buildFieldLabels = (
  customFieldsConfiguration: CasesConfigurationUI['customFields'],
  extendedFieldsLabels: CaseUI['extendedFieldsLabels'] | undefined
): Map<string, string> => {
  const labels = new Map<string, string>();
  for (const { key, type, label } of customFieldsConfiguration ?? []) {
    labels.set(getFieldCamelKey(key, getV2FieldType(type)), label);
  }
  for (const [storageKey, label] of Object.entries(extendedFieldsLabels ?? {})) {
    labels.set(camelCase(storageKey), label);
  }
  return labels;
};

// Maps a payload key (camelCased) to its field's control type (e.g. "USER_PICKER"), so a value
// that needs parsing — rather than a plain `String(value)` — is rendered correctly. Sourced from
// the case's server-enriched `extendedFieldsControls` (covers template + global fields, keyed by
// snake storage key e.g. `new_field_as_keyword`); a key with no entry (e.g. a not-yet-migrated
// legacy custom field) falls back to plain string rendering, matching prior behavior.
const buildFieldControls = (
  extendedFieldsControls: CaseUI['extendedFieldsControls'] | undefined
): Map<string, string> => {
  const controls = new Map<string, string>();
  for (const [storageKey, control] of Object.entries(extendedFieldsControls ?? {})) {
    controls.set(camelCase(storageKey), control);
  }
  return controls;
};

const isMultilineValue = (value: unknown): value is string =>
  typeof value === 'string' && value.includes('\n');

interface LabelAndBody {
  label: React.ReactNode;
  body?: React.ReactNode;
}

const getFieldLabelAndBody = (
  key: string,
  value: unknown,
  displayName: string,
  fieldControls: Map<string, string>
): LabelAndBody => {
  if (key.endsWith('AsDate') && typeof value === 'string') {
    const maybeDate = getMaybeDate(value);
    if (maybeDate.isValid()) {
      return {
        label: (
          <>
            {i18n.SET_TEMPLATE_FIELD_LABEL_PREFIX(displayName)}{' '}
            <PreferenceFormattedDate value={maybeDate.toDate()} stripMs />
          </>
        ),
      };
    }
  }

  if (isMultilineValue(value)) {
    return {
      label: i18n.SET_TEMPLATE_FIELD_LABEL_PREFIX(displayName),
      body: <ScrollableMarkdown content={value} />,
    };
  }

  const control = fieldControls.get(key);
  const displayValue =
    control != null && typeof value === 'string'
      ? getExtendedFieldDisplayValue(control, value)
      : String(value);

  return { label: i18n.SET_TEMPLATE_FIELD_LABEL(displayName, displayValue) };
};

export const createExtendedFieldsUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
  casesConfiguration,
  caseData,
}) => ({
  build: () => {
    const extendedFieldsUserAction = userAction as SnakeToCamelCase<ExtendedFieldsUserAction>;
    const fieldLabels = buildFieldLabels(
      casesConfiguration.customFields,
      caseData.extendedFieldsLabels
    );
    const fieldControls = buildFieldControls(caseData.extendedFieldsControls);

    const buildEntry = (label: LabelAndBody['label'], body: LabelAndBody['body']) => {
      const [entry] = createCommonUpdateUserActionBuilder({
        userAction,
        userProfiles,
        handleOutlineComment,
        label,
        icon: 'dot',
      }).build();

      if (body) {
        entry.children = body;
      }

      return entry;
    };

    const entries = Object.entries(extendedFieldsUserAction.payload.extendedFields ?? {});

    if (entries.length === 0) {
      return [buildEntry(i18n.UPDATED_TEMPLATE_FIELDS, undefined)];
    }

    // One activity row per field, even though the fields were saved as a single update. Saving a
    // section writes every changed field in one request — that keeps the write atomic and avoids
    // two forms racing on the same case version — but the history should still read as "what
    // changed", one line per field, exactly as it does when a field is edited on its own.
    // Sorted by label so a multi-field save reads in a stable order rather than payload order.
    return entries
      .map(([key, value]) => ({
        key,
        value,
        displayName: fieldLabels.get(key) ?? getFieldDisplayName(key),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map(({ key, value, displayName }, index) => {
        const { label, body } = getFieldLabelAndBody(key, value, displayName, fieldControls);
        const entry = buildEntry(label, body);

        // Distinct per field so each row is addressable, while the copy-link stays on the first row
        // only: there is one user action behind these rows, so one permalink — repeating it would
        // both duplicate DOM ids and imply each field could be linked to separately.
        entry[
          'data-test-subj'
        ] = `${userAction.type}-${userAction.action}-action-${userAction.id}-${key}`;
        if (index > 0) {
          delete entry.actions;
        }

        return entry;
      });
  },
});
