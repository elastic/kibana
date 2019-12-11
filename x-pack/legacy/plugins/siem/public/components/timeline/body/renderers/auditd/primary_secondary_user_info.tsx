/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import * as React from 'react';

import { DraggableBadge } from '../../../../draggables';

import * as i18n from './translations';
import { TokensFlexItem } from '../helpers';

export const nilOrUnSet = (value?: string | null) =>
  value == null || value.toLowerCase() === 'unset';

interface Props {
  contextId: string;
  eventId: string;
  primary: string | null | undefined;
  secondary: string | null | undefined;
}

export const PrimarySecondary = React.memo<Props>(({ contextId, eventId, primary, secondary }) => {
  if (nilOrUnSet(primary) && nilOrUnSet(secondary)) {
    return null;
  } else if (!nilOrUnSet(primary) && nilOrUnSet(secondary)) {
    return (
      <DraggableBadge
        contextId={contextId}
        eventId={eventId}
        field="auditd.summary.actor.primary"
        value={primary}
        iconType="user"
      />
    );
  } else if (nilOrUnSet(primary) && !nilOrUnSet(secondary)) {
    return (
      <DraggableBadge
        contextId={contextId}
        eventId={eventId}
        field="auditd.summary.actor.secondary"
        value={secondary}
        iconType="user"
      />
    );
  } else if (primary === secondary) {
    return (
      <DraggableBadge
        contextId={contextId}
        eventId={eventId}
        field="auditd.summary.actor.secondary"
        value={secondary}
        iconType="user"
      />
    );
  } else {
    return (
      <EuiFlexGroup gutterSize="none">
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="auditd.summary.actor.primary"
            value={primary}
            iconType="user"
          />
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          {i18n.AS}
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="auditd.summary.actor.secondary"
            value={secondary}
            iconType="user"
          />
        </TokensFlexItem>
      </EuiFlexGroup>
    );
  }
});

PrimarySecondary.displayName = 'PrimarySecondary';

interface PrimarySecondaryUserInfoProps {
  contextId: string;
  eventId: string;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
}

export const PrimarySecondaryUserInfo = React.memo<PrimarySecondaryUserInfoProps>(
  ({ contextId, eventId, userName, primary, secondary }) => {
    if (nilOrUnSet(userName) && nilOrUnSet(primary) && nilOrUnSet(secondary)) {
      return null;
    } else if (
      !nilOrUnSet(userName) &&
      !nilOrUnSet(primary) &&
      !nilOrUnSet(secondary) &&
      userName === primary &&
      userName === secondary
    ) {
      return (
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="user.name"
          value={userName}
          iconType="user"
        />
      );
    } else if (!nilOrUnSet(userName) && nilOrUnSet(primary) && nilOrUnSet(secondary)) {
      return (
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="user.name"
          value={userName}
          iconType="user"
        />
      );
    } else {
      return (
        <PrimarySecondary
          contextId={contextId}
          eventId={eventId}
          primary={primary}
          secondary={secondary}
        />
      );
    }
  }
);

PrimarySecondaryUserInfo.displayName = 'PrimarySecondaryUserInfo';
