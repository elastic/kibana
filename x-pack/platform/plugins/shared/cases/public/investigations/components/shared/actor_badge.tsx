/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Actor } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import * as i18n from './translations';

export interface ActorBadgeProps {
  actor: Actor;
  /** Show only the avatar and the name on one line. */
  compact?: boolean;
  /** Avatar only, with the name as its accessible label. */
  avatarOnly?: boolean;
}

export const getActorTypeLine = (actor: Actor): string | null => {
  const typeLabel =
    actor.type === 'agent'
      ? i18n.ACTOR_AGENT
      : actor.type === 'automation'
      ? i18n.ACTOR_AUTOMATION
      : null;
  const onBehalfOf = actor.on_behalf_of ? i18n.ON_BEHALF_OF(actor.on_behalf_of) : null;

  if (typeLabel && onBehalfOf) {
    return `${typeLabel} ${onBehalfOf}`;
  }
  return typeLabel ?? onBehalfOf;
};

/** The avatar of a person, agent or automation. Agents and automation show an icon. */
export const ActorAvatar: React.FC<{ actor: Actor; size?: 's' | 'm' }> = ({
  actor,
  size = 's',
}) => {
  const name = actor.name || i18n.ACTOR_UNKNOWN;

  if (actor.type === 'agent') {
    return (
      <EuiAvatar
        name={name}
        iconType={ICONS.agent}
        size={size}
        color="subdued"
        data-test-subj="investigationActorAvatar-agent"
      />
    );
  }
  if (actor.type === 'automation') {
    return (
      <EuiAvatar
        name={name}
        iconType={ICONS.automation}
        size={size}
        color="subdued"
        data-test-subj="investigationActorAvatar-automation"
      />
    );
  }
  return <EuiAvatar name={name} size={size} data-test-subj="investigationActorAvatar-user" />;
};
ActorAvatar.displayName = 'ActorAvatar';

/** Avatar, name and a line such as "Agent on behalf of Braxton W.". */
export const ActorBadge: React.FC<ActorBadgeProps> = ({
  actor,
  compact = false,
  avatarOnly = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const name = actor.name || i18n.ACTOR_UNKNOWN;

  if (avatarOnly) {
    return <ActorAvatar actor={actor} />;
  }

  const typeLine = compact ? null : getActorTypeLine(actor);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems={typeLine ? 'flexStart' : 'center'}
      responsive={false}
      css={css`
        min-width: 0;
      `}
      data-test-subj="investigationActorBadge"
    >
      <EuiFlexItem grow={false}>
        <ActorAvatar actor={actor} />
      </EuiFlexItem>
      <EuiFlexItem
        css={css`
          min-width: 0;
        `}
      >
        <EuiText size="s">
          <strong
            css={css`
              overflow-wrap: anywhere;
            `}
          >
            {name}
          </strong>
        </EuiText>
        {typeLine ? (
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              margin-block-start: ${euiTheme.size.xxs};
            `}
          >
            {typeLine}
          </EuiText>
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
ActorBadge.displayName = 'ActorBadge';
