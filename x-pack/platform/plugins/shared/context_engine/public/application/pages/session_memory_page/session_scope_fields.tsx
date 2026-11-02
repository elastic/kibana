/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/** The identity and scope fields shared by the remember, search, and save-event forms. */
export interface SessionScope {
  sessionId: string;
  userId: string;
  agentId: string;
  space: string;
  aiIndexIds: string[];
}

export const EMPTY_SESSION_SCOPE: SessionScope = {
  sessionId: '',
  userId: '',
  agentId: '',
  space: '',
  aiIndexIds: [],
};

export const hasRequiredScope = ({ sessionId, userId, agentId }: SessionScope): boolean =>
  sessionId.trim().length > 0 && userId.trim().length > 0 && agentId.trim().length > 0;

const labels = {
  sessionId: i18n.translate('xpack.contextEngine.sessionMemory.scope.sessionId', {
    defaultMessage: 'Session ID',
  }),
  userId: i18n.translate('xpack.contextEngine.sessionMemory.scope.userId', {
    defaultMessage: 'User ID',
  }),
  agentId: i18n.translate('xpack.contextEngine.sessionMemory.scope.agentId', {
    defaultMessage: 'Agent ID',
  }),
  space: i18n.translate('xpack.contextEngine.sessionMemory.scope.space', {
    defaultMessage: 'Space',
  }),
  aiIndexId: i18n.translate('xpack.contextEngine.sessionMemory.scope.aiIndexId', {
    defaultMessage: 'AI index ID',
  }),
  optional: i18n.translate('xpack.contextEngine.sessionMemory.scope.optional', {
    defaultMessage: 'Optional',
  }),
  aiIndexIdPlaceholder: i18n.translate(
    'xpack.contextEngine.sessionMemory.scope.aiIndexIdPlaceholder',
    { defaultMessage: 'Type an id and press Enter' }
  ),
};

interface SessionScopeFieldsProps {
  value: SessionScope;
  onChange: (value: SessionScope) => void;
  /** Whether session, user, and agent ids are required (writes) or filters (search). */
  required: boolean;
  /** The search API filters on a single AI index id; writes accept several. */
  singleAiIndexId?: boolean;
  isDisabled?: boolean;
  'data-test-subj': string;
}

export const SessionScopeFields = ({
  value,
  onChange,
  required,
  singleAiIndexId = false,
  isDisabled = false,
  'data-test-subj': dataTestSubj,
}: SessionScopeFieldsProps) => {
  const idField = (key: 'sessionId' | 'userId' | 'agentId', label: string) => (
    <EuiFlexItem>
      <EuiFormRow label={label} labelAppend={required ? undefined : labels.optional} fullWidth>
        <EuiFieldText
          fullWidth
          compressed
          value={value[key]}
          onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          disabled={isDisabled}
          data-test-subj={`${dataTestSubj}-${key}`}
          aria-label={label}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );

  return (
    <>
      <EuiFlexGroup gutterSize="s">
        {idField('sessionId', labels.sessionId)}
        {idField('userId', labels.userId)}
        {idField('agentId', labels.agentId)}
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow label={labels.space} labelAppend={labels.optional} fullWidth>
            <EuiFieldText
              fullWidth
              compressed
              value={value.space}
              onChange={(event) => onChange({ ...value, space: event.target.value })}
              disabled={isDisabled}
              data-test-subj={`${dataTestSubj}-space`}
              aria-label={labels.space}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiFormRow label={labels.aiIndexId} labelAppend={labels.optional} fullWidth>
            <EuiComboBox
              fullWidth
              compressed
              noSuggestions
              isDisabled={isDisabled}
              placeholder={labels.aiIndexIdPlaceholder}
              singleSelection={singleAiIndexId ? { asPlainText: true } : false}
              selectedOptions={value.aiIndexIds.map((label) => ({ label }))}
              onCreateOption={(created) => {
                const label = created.trim();
                if (!label) {
                  return;
                }
                onChange({
                  ...value,
                  aiIndexIds: singleAiIndexId ? [label] : [...value.aiIndexIds, label],
                });
              }}
              onChange={(options) =>
                onChange({ ...value, aiIndexIds: options.map((option) => option.label) })
              }
              data-test-subj={`${dataTestSubj}-aiIndexId`}
              aria-label={labels.aiIndexId}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
