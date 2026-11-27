/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { hasNewActivityClass } from '../new_activity';

const NEW_BADGE_SELECTOR = '[data-test-subj="user-action-new-badge"]';

interface UseJumpToFirstNewActivityArgs {
  comments: EuiCommentProps[];
  /** Number of new activities on the case. */
  newActivityTotal: number;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: (() => void) | undefined;
}

const scrollToFirstNewBadge = () =>
  document
    .querySelector(NEW_BADGE_SELECTOR)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });

/**
 * Returns a handler that shows the first new activity. New activity can sit in collapsed
 * activities that are not loaded yet, so the handler loads more activities until every new
 * activity is rendered or none are left to load.
 */
export const useJumpToFirstNewActivity = ({
  comments,
  newActivityTotal,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: UseJumpToFirstNewActivityArgs): (() => void) => {
  const [isJumping, setIsJumping] = useState(false);
  const loadedNewActivity = comments.filter(hasNewActivityClass).length;
  const hasLoadedAllNewActivity = loadedNewActivity >= newActivityTotal;

  useEffect(() => {
    if (!isJumping) {
      return;
    }

    if (hasLoadedAllNewActivity || !hasNextPage) {
      if (loadedNewActivity === 0) {
        setIsJumping(false);
        return;
      }
      // Wait one frame so the new rows are in the document before measuring.
      const frame = requestAnimationFrame(() => {
        scrollToFirstNewBadge();
        setIsJumping(false);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (!isFetchingNextPage) {
      fetchNextPage?.();
    }
  }, [
    isJumping,
    hasLoadedAllNewActivity,
    loadedNewActivity,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  return useCallback(() => setIsJumping(true), []);
};
