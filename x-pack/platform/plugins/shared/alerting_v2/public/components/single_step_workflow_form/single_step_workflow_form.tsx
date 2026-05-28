/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowCards } from './components/workflow_cards';
import { WorkflowItemRow } from './components/workflow_item_row';
import { getSingleStepWorkflowType } from './registry';
import type {
  SingleStepWorkflowFormValue,
  SingleStepWorkflowItem,
  SingleStepWorkflowKind,
} from './types';
import { isItemValid } from './types';

const MAX_ITEMS = 10;

interface SingleStepWorkflowFormProps {
  value: SingleStepWorkflowFormValue;
  onChange: (next: SingleStepWorkflowFormValue) => void;
  isInvalid?: boolean;
}

export const createInitialValue = (): SingleStepWorkflowFormValue => [];

export const SingleStepWorkflowForm = ({
  value,
  onChange,
  isInvalid,
}: SingleStepWorkflowFormProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const addItem = useCallback(
    (kind: SingleStepWorkflowKind) => {
      const id = uuidv4();
      let newItem: SingleStepWorkflowItem;
      if (kind === 'workflow') {
        newItem = { id, kind: 'workflow', workflowId: null };
      } else {
        const type = getSingleStepWorkflowType(kind);
        newItem = { id, kind, connectorId: null, params: type?.paramsTemplate ?? '' };
      }
      onChange([...value, newItem]);
      setExpandedId(id);
      setIsPickerOpen(false);
    },
    [value, onChange]
  );

  const removeItem = useCallback(
    (id: string) => {
      onChange(value.filter((item) => item.id !== id));
      setExpandedId((prev) => (prev === id ? null : prev));
    },
    [value, onChange]
  );

  const updateItem = useCallback(
    (updated: SingleStepWorkflowItem) => {
      onChange(value.map((item) => (item.id === updated.id ? updated : item)));
    },
    [value, onChange]
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (value.length === 0) {
    return (
      <div data-test-subj="singleStepWorkflowForm">
        <WorkflowCards onPick={addItem} />
      </div>
    );
  }

  return (
    <div data-test-subj="singleStepWorkflowForm">
      <EuiFlexGroup direction="column" gutterSize="s">
        {value.map((item) => (
          <EuiFlexItem key={item.id}>
            <WorkflowItemRow
              item={item}
              isExpanded={expandedId === item.id}
              isInvalid={isInvalid === true && !isItemValid(item)}
              onToggleExpand={toggleExpand}
              onRemove={removeItem}
              onChange={updateItem}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isPickerOpen ? (
        <WorkflowCards onPick={addItem} onCancel={() => setIsPickerOpen(false)} />
      ) : (
        value.length < MAX_ITEMS && (
          <EuiButton
            iconType="plusInCircle"
            size="s"
            color="text"
            onClick={() => setIsPickerOpen(true)}
            data-test-subj="singleStepWorkflowAddAnother"
          >
            {i18n.translate('xpack.alertingV2.singleStepWorkflow.list.addAnother', {
              defaultMessage: 'Add another action',
            })}
          </EuiButton>
        )
      )}
    </div>
  );
};
