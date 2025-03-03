/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesConfigurationUICustomField, CaseUICustomField } from '../../../../common/ui';
import type { SnakeToCamelCase } from '../../../../common/types';
import type { CustomFieldsUserAction } from '../../../../common/types/domain';
import { createCommonUpdateUserActionBuilder } from '../common';
import type { UserActionBuilder } from '../types';
import * as i18n from '../translations';

const getLabelTitle = (
  customField: CaseUICustomField,
  customFieldConfiguration?: CasesConfigurationUICustomField
) => {
  const customFieldValue = customField.value;
  const label = customFieldConfiguration?.label ?? customFieldConfiguration?.key ?? i18n.UNKNOWN;

  if (
    customFieldValue == null ||
    (Array.isArray(customFieldValue) && customFieldValue.length === 0)
  ) {
    return i18n.CHANGED_FIELD_TO_EMPTY(label);
  }

  const value = Array.isArray(customFieldValue) ? customFieldValue[0] : customFieldValue;

  return `${i18n.CHANGED_FIELD.toLowerCase()} ${label} ${i18n.TO} "${value}"`;
};

export const createCustomFieldsUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
  userProfiles,
  casesConfiguration,
}) => ({
  build: () => {
    const customFieldsUserAction = userAction as SnakeToCamelCase<CustomFieldsUserAction>;

    if (customFieldsUserAction.payload.customFields.length === 0) {
      return [];
    }

    const customField = customFieldsUserAction.payload.customFields[0];
    const customFieldConfiguration = casesConfiguration.customFields.find(
      (configCustomField) => configCustomField.key === customField.key
    );

    const label = getLabelTitle(customField, customFieldConfiguration);
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
