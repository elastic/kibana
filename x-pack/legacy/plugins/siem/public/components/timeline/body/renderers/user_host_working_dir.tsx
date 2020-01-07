/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DraggableBadge } from '../../../draggables';
import { TokensFlexItem } from './helpers';
import { HostWorkingDir } from './host_working_dir';

interface Props {
  contextId: string;
  eventId: string;
  userDomain: string | null | undefined;
  userDomainField?: string;
  userName: string | null | undefined;
  userNameField?: string;
  hostName: string | null | undefined;
  hostNameSeparator?: string;
  workingDirectory: string | null | undefined;
}

export const UserHostWorkingDir = React.memo<Props>(
  ({
    contextId,
    eventId,
    hostName,
    hostNameSeparator = '@',
    userDomain,
    userDomainField = 'user.domain',
    userName,
    userNameField = 'user.name',
    workingDirectory,
  }) =>
    userName != null || userDomain != null || hostName != null || workingDirectory != null ? (
      <>
        <TokensFlexItem component="span" grow={false}>
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field={userNameField}
            iconType="user"
            value={userName}
          />
        </TokensFlexItem>

        {userDomain != null && (
          <>
            <TokensFlexItem
              component="span"
              data-test-subj="user-host-working-dir-domain-separator-text"
              grow={false}
            >
              {'\\'}
            </TokensFlexItem>
            <TokensFlexItem component="span" grow={false}>
              <DraggableBadge
                contextId={contextId}
                eventId={eventId}
                field={userDomainField}
                value={userDomain}
              />
            </TokensFlexItem>
          </>
        )}

        {hostName != null && userName != null && (
          <TokensFlexItem component="span" grow={false}>
            {hostNameSeparator}
          </TokensFlexItem>
        )}
        <HostWorkingDir
          contextId={contextId}
          eventId={eventId}
          hostName={hostName}
          workingDirectory={workingDirectory}
        />
      </>
    ) : null
);

UserHostWorkingDir.displayName = 'UserHostWorkingDir';
