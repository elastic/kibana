/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';

import type { SnakeToCamelCase } from '../../../common/types';
import type { SyncUserAction } from '../../../common/types/domain';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import * as i18n from './translations';

const FIELD_LABELS: Record<string, string> = {
  title: i18n.TITLE,
  description: i18n.DESCRIPTION,
  status: i18n.STATUS,
  severity: i18n.SEVERITY,
};

const toFieldList = (fields: string[]) =>
  fields.map((field) => (FIELD_LABELS[field] ?? field).toLowerCase()).join(', ');

const getLabel = (payload: SnakeToCamelCase<SyncUserAction>['payload']['sync']) => {
  const { updatedFields, conflictedFields, connectorName, externalTitle, externalUrl } = payload;
  const summary =
    updatedFields.length > 0
      ? i18n.SYNCED_FIELDS_FROM(toFieldList(updatedFields), connectorName)
      : i18n.SYNCED_NO_CHANGES_FROM(connectorName);

  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="xs"
      data-test-subj="sync-label-title"
      responsive={false}
    >
      <EuiFlexItem grow={false} data-test-subj="sync-label">
        {conflictedFields.length > 0
          ? `${summary}, ${i18n.SYNC_KEPT_FIELDS(toFieldList(conflictedFields))}`
          : summary}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="sync-external-link" href={externalUrl} target="_blank">
          {externalTitle}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const createSyncUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const syncUserAction = userAction as SnakeToCamelCase<SyncUserAction>;

    return createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label: getLabel(syncUserAction.payload.sync),
      icon: 'refresh',
    }).build();
  },
});
