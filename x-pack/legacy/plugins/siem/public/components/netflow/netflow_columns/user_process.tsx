/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { uniq } from 'lodash/fp';
import React from 'react';

import { DraggableBadge } from '../../draggables';

export const PROCESS_NAME_FIELD_NAME = 'process.name';
export const USER_NAME_FIELD_NAME = 'user.name';

/**
 * Renders a column of draggable badges containing:
 * - `user.name`
 * - `process.name`
 */
export const UserProcess = React.memo<{
  contextId: string;
  eventId: string;
  processName?: string[] | null;
  userName?: string[] | null;
}>(({ contextId, eventId, processName, userName }) => (
  <EuiFlexGroup
    alignItems="flexStart"
    data-test-subj="user-process"
    direction="column"
    gutterSize="none"
    justifyContent="center"
  >
    {userName != null
      ? uniq(userName).map(user => (
          <EuiFlexItem key={user} grow={false}>
            <DraggableBadge
              contextId={contextId}
              data-test-subj="user-name"
              eventId={eventId}
              field={USER_NAME_FIELD_NAME}
              iconType="user"
              value={user}
            />
          </EuiFlexItem>
        ))
      : null}

    {processName != null
      ? uniq(processName).map(process => (
          <EuiFlexItem key={process} grow={false}>
            <DraggableBadge
              contextId={contextId}
              data-test-subj="process-name"
              eventId={eventId}
              field={PROCESS_NAME_FIELD_NAME}
              iconType="console"
              value={process}
            />
          </EuiFlexItem>
        ))
      : null}
  </EuiFlexGroup>
));

UserProcess.displayName = 'UserProcess';
