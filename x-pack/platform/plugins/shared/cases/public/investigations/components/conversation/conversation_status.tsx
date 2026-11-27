/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiButton } from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { getHttpErrorMessage, useEnsureConversation } from '../../hooks';
import { ICONS } from '../../icons';
import { EmptyState, LoadingState } from '../shared';
import * as i18n from './translations';

/** Creates the conversation of a record that has none, once, and shows progress or the error. */
export const ConversationStarting: React.FC<{ record: InvestigationRecord }> = ({ record }) => {
  const { mutate, isError, error } = useEnsureConversation(record.id);

  useEffect(() => {
    mutate();
  }, [mutate, record.id]);

  if (isError) {
    return (
      <EmptyState
        iconType={ICONS.warning}
        title={i18n.CONVERSATION_START_ERROR}
        body={getHttpErrorMessage(error)}
        actions={
          <EuiButton onClick={() => mutate()} data-test-subj="investigationConversationRetry">
            {i18n.RETRY}
          </EuiButton>
        }
        data-test-subj="investigationConversationStartError"
      />
    );
  }
  return <LoadingState label={i18n.CONVERSATION_STARTING} />;
};
ConversationStarting.displayName = 'ConversationStarting';

/** Shown instead of the conversation when Agent Builder is not available to the user. */
export const ConversationUnavailable: React.FC<{ explanation: string }> = ({ explanation }) => (
  <EmptyState
    iconType={ICONS.info}
    title={i18n.CONVERSATION_UNAVAILABLE_TITLE}
    body={explanation}
    data-test-subj="investigationConversationUnavailable"
  />
);
ConversationUnavailable.displayName = 'ConversationUnavailable';
