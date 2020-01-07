/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DraggableBadge } from '../../../../draggables';

import * as i18n from './translations';
import { TokensFlexItem } from '../helpers';
import { HostWorkingDir } from '../host_working_dir';
import { PrimarySecondaryUserInfo } from './primary_secondary_user_info';

interface Props {
  eventId: string;
  contextId: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  workingDirectory: string | null | undefined;
  session: string | null | undefined;
}

export const SessionUserHostWorkingDir = React.memo<Props>(
  ({ eventId, contextId, hostName, userName, primary, secondary, workingDirectory, session }) => (
    <>
      <TokensFlexItem component="span" grow={false}>
        {i18n.SESSION}
      </TokensFlexItem>
      <TokensFlexItem component="span" grow={false}>
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="auditd.session"
          iconType="number"
          value={session}
        />
      </TokensFlexItem>
      <TokensFlexItem component="span" grow={false}>
        <PrimarySecondaryUserInfo
          contextId={contextId}
          eventId={eventId}
          primary={primary}
          secondary={secondary}
          userName={userName}
        />
      </TokensFlexItem>
      {hostName != null && (
        <TokensFlexItem component="span" grow={false}>
          {'@'}
        </TokensFlexItem>
      )}
      <HostWorkingDir
        contextId={contextId}
        eventId={eventId}
        hostName={hostName}
        workingDirectory={workingDirectory}
      />
    </>
  )
);

SessionUserHostWorkingDir.displayName = 'SessionUserHostWorkingDir';
