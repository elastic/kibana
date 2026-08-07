/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface MemorySetupPromptProps {
  canManage: boolean;
  isSettingUp: boolean;
  onSetUp: () => void;
}

/**
 * The "not set up yet" state.
 *
 * The body says what setting up actually creates — hidden data streams plus
 * scheduled jobs that call an LLM. Nobody should discover recurring model spend
 * from a one-word button.
 */
export const MemorySetupPrompt = ({ canManage, isSettingUp, onSetUp }: MemorySetupPromptProps) => (
  <EuiEmptyPrompt
    data-test-subj="contextMemorySetupPrompt"
    iconType="sparkles"
    title={
      <h3>
        {i18n.translate('xpack.contextEngine.memory.setupPromptTitle', {
          defaultMessage: 'Set up memory',
        })}
      </h3>
    }
    body={
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.contextEngine.memory.setupPromptBody', {
            defaultMessage:
              'Memory is a shared knowledge base your agents read from and write to, so what they learn in one conversation is available in the next. It is shared across this deployment.',
          })}
        </p>
        <p>
          {i18n.translate('xpack.contextEngine.memory.setupPromptDetail', {
            defaultMessage:
              'Setting up memory creates two hidden data streams and enables background jobs that call your AI connector on a schedule to curate the knowledge base. You can turn those jobs off at any time.',
          })}
        </p>
        {!canManage && (
          <p>
            <FormattedMessage
              id="xpack.contextEngine.memory.setupPromptNoPermission"
              defaultMessage="Ask an administrator to set up memory."
            />
          </p>
        )}
      </EuiText>
    }
    actions={
      canManage
        ? [
            <EuiButton
              key="set-up-memory"
              fill
              isLoading={isSettingUp}
              onClick={onSetUp}
              data-test-subj="contextSetUpMemoryButton"
            >
              {i18n.translate('xpack.contextEngine.memory.setupPromptButton', {
                defaultMessage: 'Set up memory',
              })}
            </EuiButton>,
          ]
        : []
    }
  />
);
