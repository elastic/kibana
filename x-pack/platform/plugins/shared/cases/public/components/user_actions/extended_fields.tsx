/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { startCase } from 'lodash';
import type { SnakeToCamelCase } from '../../../common/types';
import type { ExtendedFieldsUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
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

const getLabelTitle = (userAction: SnakeToCamelCase<ExtendedFieldsUserAction>): React.ReactNode => {
  const extendedFields = userAction.payload.extendedFields ?? {};
  const entries = Object.entries(extendedFields);

  if (entries.length === 1) {
    const [key, value] = entries[0];
    const displayName = getFieldDisplayName(key);

    if (key.endsWith('AsDate') && typeof value === 'string') {
      const maybeDate = getMaybeDate(value);
      if (maybeDate.isValid()) {
        return (
          <>
            {i18n.SET_TEMPLATE_FIELD_LABEL_PREFIX(displayName)}{' '}
            <PreferenceFormattedDate value={maybeDate.toDate()} stripMs />
          </>
        );
      }
    }

    return i18n.SET_TEMPLATE_FIELD_LABEL(displayName, String(value));
  }

  return i18n.UPDATED_TEMPLATE_FIELDS;
};

export const createExtendedFieldsUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const extendedFieldsUserAction = userAction as SnakeToCamelCase<ExtendedFieldsUserAction>;
    const label = getLabelTitle(extendedFieldsUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
