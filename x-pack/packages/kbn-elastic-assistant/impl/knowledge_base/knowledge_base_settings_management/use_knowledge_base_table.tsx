/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLink } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedDate } from '@kbn/i18n-react';
import { User } from '@kbn/elastic-assistant-common';

export const useKnowledgeBaseTable = () => {
  const getColumns = useCallback(({ onEntryNameClicked, onSpaceNameClicked }) => {
    return [
      {
        name: 'Name',
        render: ({ id }: { id: string }) => (
          <EuiLink onClick={() => onEntryNameClicked(id)}>{id}</EuiLink>
        ),
      },
      {
        name: 'Users',
        render: ({ users }: { users: User[] }) => (
          <>
            {users && users.length > 0 ? (
              <div>
                {users.map((c, idx) => (
                  <EuiBadge id={`${idx}`} color="hollow">
                    {c.name}
                  </EuiBadge>
                ))}
              </div>
            ) : null}
          </>
        ),
      },
      {
        name: 'Space',
        render: ({ namespace }: { namespace: string }) => (
          <EuiLink onClick={() => onSpaceNameClicked(namespace)}>{namespace}</EuiLink>
        ),
      },
      {
        name: 'Date created',
        render: ({ createdAt }: { createdAt: string }) => (
          <>
            {createdAt ? (
              <EuiBadge color="hollow">
                <FormattedDate
                  value={new Date(createdAt)}
                  year="numeric"
                  month="2-digit"
                  day="numeric"
                />
              </EuiBadge>
            ) : null}
          </>
        ),
      },
    ];
  }, []);
  return { getColumns };
};
