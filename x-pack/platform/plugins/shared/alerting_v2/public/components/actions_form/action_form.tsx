/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ActionRow } from './components/action_row';
import { ActionTemplateCards, type ActionTemplateId } from './components/action_template_cards';
import { getInlineActionStepDefinition } from './registry';
import type { ActionDraft, ActionFormValue, InlineActionStepType } from './types';
import { isActionValid } from './types';

const MAX_ACTIONS = 10;

interface ActionFormProps {
  value: ActionFormValue;
  onChange: (next: ActionFormValue) => void;
  isInvalid?: boolean;
}

export const createInitialActionFormValue = (): ActionFormValue => [];

const buildActionFromTemplate = (templateId: ActionTemplateId): ActionDraft => {
  const id = uuidv4();
  if (templateId === 'existing-workflow') {
    return { id, source: 'existing', workflowId: null };
  }
  const stepType = templateId.slice('inline-'.length) as InlineActionStepType;
  const definition = getInlineActionStepDefinition(stepType);
  return {
    id,
    source: 'inline',
    stepType,
    connectorId: null,
    params: definition?.paramsTemplate ?? '',
  };
};

export const ActionForm = ({ value, onChange, isInvalid }: ActionFormProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const addAction = (templateId: ActionTemplateId) => {
    const newAction = buildActionFromTemplate(templateId);
    onChange([...value, newAction]);
    setExpandedId(newAction.id);
    setIsPickerOpen(false);
  };

  const removeAction = (id: string) => {
    onChange(value.filter((action) => action.id !== id));
    setExpandedId((prev) => (prev === id ? null : prev));
  };

  const updateAction = (updated: ActionDraft) => {
    onChange(value.map((action) => (action.id === updated.id ? updated : action)));
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (value.length === 0) {
    return (
      <div data-test-subj="actionForm">
        <ActionTemplateCards onPick={addAction} />
      </div>
    );
  }

  return (
    <div data-test-subj="actionForm">
      <EuiFlexGroup direction="column" gutterSize="s">
        {value.map((action) => (
          <EuiFlexItem key={action.id}>
            <ActionRow
              action={action}
              isExpanded={expandedId === action.id}
              isInvalid={isInvalid === true && !isActionValid(action)}
              onToggleExpand={toggleExpand}
              onRemove={removeAction}
              onChange={updateAction}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isPickerOpen ? (
        <ActionTemplateCards onPick={addAction} onCancel={() => setIsPickerOpen(false)} />
      ) : (
        value.length < MAX_ACTIONS && (
          <EuiButton
            iconType="plusInCircle"
            size="s"
            color="text"
            onClick={() => setIsPickerOpen(true)}
            data-test-subj="actionFormAddAnother"
          >
            {i18n.translate('xpack.alertingV2.actionForm.list.addAnother', {
              defaultMessage: 'Add another action',
            })}
          </EuiButton>
        )
      )}
    </div>
  );
};
