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

const isMultilineValue = (value: unknown): value is string =>
  typeof value === 'string' && value.includes('\n');

interface LabelAndBody {
  label: React.ReactNode;
  body?: React.ReactNode;
}

const getLabelAndBody = (
  userAction: SnakeToCamelCase<ExtendedFieldsUserAction>,
  fieldLabels: Map<string, string>
): LabelAndBody => {
  const extendedFields = userAction.payload.extendedFields ?? {};
  const entries = Object.entries(extendedFields);

  if (entries.length === 1) {
    const [key, value] = entries[0];
    const displayName = fieldLabels.get(key) ?? getFieldDisplayName(key);

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

    return { label: i18n.SET_TEMPLATE_FIELD_LABEL(displayName, String(value)) };
  }

  return { label: i18n.UPDATED_TEMPLATE_FIELDS };
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
    const { label, body } = getLabelAndBody(extendedFieldsUserAction, fieldLabels);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    const result = commonBuilder.build();

    if (body) {
      result[0].children = body;
    }

    return result;
  },
});
