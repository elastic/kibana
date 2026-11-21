/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import type { ThreadRef } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { RelativeTime } from '../shared';
import * as i18n from './translations';

export interface ThreadBarProps {
  thread: ThreadRef;
  onBack: () => void;
  /** Right-aligned content, e.g. the thread summary button. */
  actions?: React.ReactNode;
  compact?: boolean;
}

/** Shown above a thread: back to the main conversation, the thread's title, anchor and creator. */
export const ThreadBar: React.FC<ThreadBarProps> = ({ thread, onBack, actions, compact }) => (
  <EuiPanel
    color="subdued"
    hasShadow={false}
    paddingSize="s"
    data-test-subj="investigationThreadBar"
  >
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType={ICONS.chevronLeft}
          onClick={onBack}
          aria-label={i18n.BACK_TO_MAIN}
          data-test-subj="investigationThreadBack"
        >
          {compact ? i18n.MAIN_CONVERSATION : i18n.BACK_TO_MAIN}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong data-test-subj="investigationThreadTitle">{thread.title}</strong>{' '}
          {thread.anchor ? (
            <EuiBadge color="hollow" data-test-subj="investigationThreadAnchor">
              {i18n.THREAD_ANCHOR(thread.anchor)}
            </EuiBadge>
          ) : null}
        </EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.THREAD_META(thread.created_by.name)}
          {' · '}
          <RelativeTime value={thread.created_at} />
        </EuiText>
      </EuiFlexItem>
      {actions ? <EuiFlexItem grow={false}>{actions}</EuiFlexItem> : null}
    </EuiFlexGroup>
  </EuiPanel>
);
ThreadBar.displayName = 'ThreadBar';
