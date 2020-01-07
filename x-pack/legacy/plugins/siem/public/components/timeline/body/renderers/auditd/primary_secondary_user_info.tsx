/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

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
        iconType="user"
        value={primary}
      />
    );
  } else if (nilOrUnSet(primary) && !nilOrUnSet(secondary)) {
    return (
      <DraggableBadge
        contextId={contextId}
        eventId={eventId}
        field="auditd.summary.actor.secondary"
        iconType="user"
        value={secondary}
      />
    );
  } else if (primary === secondary) {
    return (
      <DraggableBadge
        contextId={contextId}
        eventId={eventId}
        field="auditd.summary.actor.secondary"
        iconType="user"
        value={secondary}
      />
    );
  } else {
    return (
      <EuiFlexGroup gutterSize="none">
        <TokensFlexItem component="span" grow={false}>
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="auditd.summary.actor.primary"
            iconType="user"
            value={primary}
          />
        </TokensFlexItem>
        <TokensFlexItem component="span" grow={false}>
          {i18n.AS}
        </TokensFlexItem>
        <TokensFlexItem component="span" grow={false}>
          <DraggableBadge
            contextId={contextId}
            eventId={eventId}
            field="auditd.summary.actor.secondary"
            iconType="user"
            value={secondary}
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
          iconType="user"
          value={userName}
        />
      );
    } else if (!nilOrUnSet(userName) && nilOrUnSet(primary) && nilOrUnSet(secondary)) {
      return (
        <DraggableBadge
          contextId={contextId}
          eventId={eventId}
          field="user.name"
          iconType="user"
          value={userName}
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
