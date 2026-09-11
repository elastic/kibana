/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ReactNode } from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { Conversation } from '@kbn/agent-builder-common';
import type { Investigation } from '../types';
import { useConversationInvestigation } from '../hooks/use_conversation_investigation';
import { TEMPLATE_UI_LABELS } from './translations';

export interface InvestigationSlotProps {
  conversation: Conversation;
  /**
   * Header and footer slots sit in tight chrome, so they collapse to nothing rather than showing
   * a full empty prompt when the investigation is missing or fails to load.
   */
  compact?: boolean;
  /** Rendered instead of the empty prompt when the investigation cannot be resolved. */
  fallback?: ReactNode;
  children: (investigation: Investigation, refresh: () => void) => ReactNode;
}

/** Resolves the conversation's investigation and renders `children` once it is available. */
export const InvestigationSlot = memo<InvestigationSlotProps>(
  ({ conversation, compact = false, fallback, children }) => {
    const { investigation, isLoading, error, refresh } = useConversationInvestigation(conversation);

    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size={compact ? 'm' : 'l'} aria-label={TEMPLATE_UI_LABELS.loading} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (error || !investigation) {
      if (fallback !== undefined) {
        return <>{fallback}</>;
      }
      if (compact) {
        return null;
      }
      return (
        <EuiEmptyPrompt
          iconType={error ? 'warning' : 'documents'}
          color={error ? 'danger' : 'subdued'}
          title={
            <h3>{error ? TEMPLATE_UI_LABELS.loadErrorTitle : TEMPLATE_UI_LABELS.notFoundTitle}</h3>
          }
        />
      );
    }

    return <>{children(investigation, refresh)}</>;
  }
);

InvestigationSlot.displayName = 'InvestigationSlot';
