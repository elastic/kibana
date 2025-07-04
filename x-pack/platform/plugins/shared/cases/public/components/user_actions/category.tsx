/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../common/types';
import type { CategoryUserAction } from '../../../common/types/domain';
import { UserActionActions } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';

import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const getLabelTitle = (userAction: SnakeToCamelCase<CategoryUserAction>) => {
  const category = userAction.payload.category ?? '';
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      data-test-subj={`${userAction.id}-category-user-action-title`}
      responsive={false}
    >
      {userAction.action === UserActionActions.update ? (
        <EuiFlexItem grow={false}>{`${i18n.ADD_CATEGORY} "${category}"`}</EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>{i18n.REMOVE_CATEGORY}</EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const createCategoryUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const categoryUserAction = userAction as SnakeToCamelCase<CategoryUserAction>;
    const label = getLabelTitle(categoryUserAction);
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
