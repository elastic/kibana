/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../common/types';
import type { TagsUserAction } from '../../../common/types/domain';
import { UserActionActions } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { Tags } from '../tags/tags';
import * as i18n from './translations';

const getLabelTitle = (userAction: SnakeToCamelCase<TagsUserAction>) => {
  const tags = userAction.payload.tags ?? [];

  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span" responsive={false}>
      <EuiFlexItem data-test-subj="ua-tags-label" grow={false}>
        {userAction.action === UserActionActions.add && i18n.ADDED_FIELD}
        {userAction.action === UserActionActions.delete && i18n.REMOVED_FIELD}{' '}
        {i18n.TAGS.toLowerCase()}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Tags tags={tags} gutterSize="xs" color="hollow" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createTagsUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const tagsUserAction = userAction as SnakeToCamelCase<TagsUserAction>;
    const label = getLabelTitle(tagsUserAction);
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'tag',
    });

    return commonBuilder.build();
  },
});
