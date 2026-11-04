/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFieldArray, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData } from '../types';
import { ActionEditor } from './action_editor';
import { createEmptyAction } from '../lib/form_serializers';

/** Larger definitions start collapsed, so the list reads as an overview of the actions. */
const MAX_INITIALLY_OPEN_ACTIONS = 3;

/** The list of actions a connector type offers; one is shown by default. Its step names it. */
const ActionListEditorComponent: React.FC = () => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const { fields, append, remove } = useFieldArray({ control, name: 'actions' });
  const { errors } = useFormState({ control, name: 'actions' });
  const listError = errors.actions?.root?.message;
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    () => new Set(fields.length > MAX_INITIALLY_OPEN_ACTIONS ? fields.map(({ id }) => id) : [])
  );

  const setOpen = useCallback((id: string, isOpen: boolean) => {
    setCollapsedIds((current) => {
      if (current.has(id) !== isOpen) return current;
      const next = new Set(current);
      if (isOpen) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allCollapsed = fields.length > 0 && fields.every(({ id }) => collapsedIds.has(id));
  const toggleAll = () =>
    setCollapsedIds(allCollapsed ? new Set() : new Set(fields.map(({ id }) => id)));

  return (
    <div data-test-subj="buildConnectorActions">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.buildConnectorPage.actionsDescription"
              defaultMessage="The HTTP requests this connector type can make. A rule picks one and provides its input values."
            />
          </EuiText>
        </EuiFlexItem>
        {fields.length > 1 && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType={allCollapsed ? 'unfold' : 'fold'}
              onClick={toggleAll}
              data-test-subj="buildConnectorActions-toggleAll"
            >
              {allCollapsed
                ? i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.expandAllActions',
                    { defaultMessage: 'Expand all' }
                  )
                : i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.collapseAllActions',
                    { defaultMessage: 'Collapse all' }
                  )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {fields.map((item, index) => (
        <React.Fragment key={item.id}>
          <EuiSpacer size="s" />
          <ActionEditor
            index={index}
            onRemove={() => remove(index)}
            id={item.id}
            isOpen={!collapsedIds.has(item.id)}
            onOpenChange={setOpen}
          />
        </React.Fragment>
      ))}
      {listError && (
        <EuiFormErrorText data-test-subj="buildConnectorActions-error">
          {listError}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        iconType="plusCircle"
        onClick={() => append(createEmptyAction())}
        data-test-subj="buildConnectorActions-add"
      >
        {i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.addActionButtonLabel',
          {
            defaultMessage: 'Add action',
          }
        )}
      </EuiButtonEmpty>
    </div>
  );
};

export const ActionListEditor = memo(ActionListEditorComponent);
