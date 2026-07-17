/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { TemplateUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const getLabelTitle = (userAction: SnakeToCamelCase<TemplateUserAction>): React.ReactNode => {
  const { template } = userAction.payload;
  if (template == null) {
    return i18n.REMOVED_TEMPLATE_LABEL;
  }
  // Older user actions may not carry the template name; fall back to the generic label.
  return template.name
    ? i18n.APPLIED_NAMED_TEMPLATE_LABEL(template.name)
    : i18n.APPLIED_TEMPLATE_LABEL;
};

export const createTemplateUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const templateUserAction = userAction as SnakeToCamelCase<TemplateUserAction>;
    const label = getLabelTitle(templateUserAction);
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
