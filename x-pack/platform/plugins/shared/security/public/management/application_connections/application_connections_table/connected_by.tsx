/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';

import type { OAuthConnectionUser } from '../service/application_connections_api_client';

export interface ConnectedByOptions {
  userId?: string;
  user?: OAuthConnectionUser;
}

export const getConnectedByDisplayName = ({
  userId,
  user,
}: ConnectedByOptions): string | undefined => {
  return user?.email || userId;
};

export interface ConnectedByProps extends ConnectedByOptions {
  ['data-test-subj']?: string;
}

export const ConnectedBy = ({ userId, user, 'data-test-subj': dataTestSubj }: ConnectedByProps) => {
  if (!userId && !user) {
    return (
      <EuiText color="subdued" size="s" data-test-subj={dataTestSubj}>
        {'—'}
      </EuiText>
    );
  }

  const displayName = getConnectedByDisplayName({ userId, user });

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      data-test-subj={dataTestSubj}
    >
      {user && (
        <EuiFlexItem grow={false}>
          <EuiAvatar name={displayName ?? ''} size="s" />
        </EuiFlexItem>
      )}
      <EuiText size="s">{displayName}</EuiText>
    </EuiFlexGroup>
  );
};
