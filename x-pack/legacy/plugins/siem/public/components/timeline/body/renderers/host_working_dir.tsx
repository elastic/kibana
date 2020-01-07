/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { DraggableBadge } from '../../../draggables';

import * as i18n from './translations';
import { TokensFlexItem } from './helpers';

interface Props {
  contextId: string;
  eventId: string;
  hostName: string | null | undefined;
  workingDirectory: string | null | undefined;
}

export const HostWorkingDir = React.memo<Props>(
  ({ contextId, eventId, hostName, workingDirectory }) => (
    <>
      <TokensFlexItem component="span" grow={false}>
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="host.name"
          value={hostName}
        />
      </TokensFlexItem>
      {workingDirectory != null && (
        <TokensFlexItem component="span" grow={false}>
          {i18n.IN}
        </TokensFlexItem>
      )}
      <TokensFlexItem component="span" grow={false}>
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="process.working_directory"
          iconType="folderOpen"
          value={workingDirectory}
        />
      </TokensFlexItem>
    </>
  )
);

HostWorkingDir.displayName = 'HostWorkingDir';
