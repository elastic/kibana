/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';

import type { FollowerIndex } from '../../../../common/types';

import { FollowerIndexPauseProvider } from './follower_index_pause_provider';
import { FollowerIndexResumeProvider } from './follower_index_resume_provider';
import { FollowerIndexUnfollowProvider } from './follower_index_unfollow_provider';

export interface FollowerIndexActionsCallbacks {
  pauseFollowerIndex: (index: FollowerIndex | FollowerIndex[]) => void;
  resumeFollowerIndex: (id: string | string[]) => void;
  unfollowLeaderIndex: (id: string | string[]) => void;
}

interface Props {
  children: (getActions: () => FollowerIndexActionsCallbacks) => ReactNode;
}

export const FollowerIndexActionsProvider = (props: Props) => {
  return (
    <FollowerIndexPauseProvider>
      {(pauseFollowerIndex) => (
        <FollowerIndexResumeProvider>
          {(resumeFollowerIndex) => (
            <FollowerIndexUnfollowProvider>
              {(unfollowLeaderIndex) => {
                const { children } = props;
                return children(() => ({
                  pauseFollowerIndex,
                  resumeFollowerIndex,
                  unfollowLeaderIndex,
                }));
              }}
            </FollowerIndexUnfollowProvider>
          )}
        </FollowerIndexResumeProvider>
      )}
    </FollowerIndexPauseProvider>
  );
};
