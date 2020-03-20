/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import React from 'react';

import { CaseUserActions } from '../../../../containers/case/types';
import * as i18n from '../case_view/translations';

export const getLabelTitle = (field: string, action: CaseUserActions) => {
  if (field === 'tags' && action.action === 'add') {
    return (
      <EuiFlexGroup alignItems="baseline" gutterSize="xs" component="span">
        <EuiFlexItem>
          {i18n.ADDED_FIELD} {i18n.TAGS.toLowerCase()}
        </EuiFlexItem>
        {action.newValue != null &&
          action.newValue.split(',').map(tag => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge color="default">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    );
  }
  if (field === 'tags' && action.action === 'delete') {
    return (
      <EuiFlexGroup alignItems="baseline" gutterSize="xs">
        <EuiFlexItem>
          {i18n.REMOVED_FIELD} {i18n.TAGS.toLowerCase()}
        </EuiFlexItem>
        {action.newValue != null &&
          action.newValue.split(',').map(tag => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge color="default">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    );
  } else if (field === 'title' && action.action === 'update') {
    return `${i18n.CHANGED_FIELD.toLowerCase()} ${i18n.CASE_NAME.toLowerCase()}  ${i18n.TO} "${
      action.newValue
    }"`;
  } else if (field === 'description' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;
  } else if (field === 'status' && action.action === 'update') {
    return `${
      action.newValue === 'open' ? i18n.REOPENED_CASE.toLowerCase() : i18n.CLOSED_CASE.toLowerCase()
    } ${i18n.CASE}`;
  } else if (field === 'comment' && action.action === 'update') {
    return `${i18n.EDITED_FIELD} ${i18n.COMMENT.toLowerCase()}`;
  }
  return '';
};
