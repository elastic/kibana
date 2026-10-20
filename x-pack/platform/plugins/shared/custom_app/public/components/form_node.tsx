/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId, useState, type FormEvent } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiText,
  EuiTextArea,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MAX_STATE_STRING_LENGTH,
  type AppNodeOfType,
  type FormField,
} from '@kbn/custom-app-common';
import { useStateValues } from '../runtime/app_runtime_context';
import { useActionRunner } from '../workflows/use_action_runner';
import { useWorkflowRunner } from '../workflows/workflow_runner';
import { DroppedActions } from './dropped_actions';

const requiredLabel = i18n.translate('xpack.customApp.formNode.required', {
  defaultMessage: 'Required',
});

const FieldInput = ({
  field,
  id,
  value,
  isInvalid,
  onChange,
}: {
  field: FormField;
  id: string;
  value: string;
  isInvalid: boolean;
  onChange: (next: string) => void;
}) => {
  switch (field.kind) {
    case 'text':
      return (
        <EuiFieldText
          compressed
          fullWidth
          id={id}
          value={value}
          isInvalid={isInvalid}
          maxLength={MAX_STATE_STRING_LENGTH}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'textarea':
      return (
        <EuiTextArea
          compressed
          fullWidth
          id={id}
          rows={3}
          value={value}
          isInvalid={isInvalid}
          maxLength={MAX_STATE_STRING_LENGTH}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case 'select':
      return (
        <EuiSelect
          compressed
          fullWidth
          id={id}
          aria-label={field.label}
          value={value}
          isInvalid={isInvalid}
          // An answer that is none of the options, such as an empty one, shows as nothing chosen.
          hasNoInitialSelection={!field.options.some((option) => option.value === value)}
          options={field.options.map((option) => ({
            value: option.value,
            text: option.label ?? option.value,
          }))}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
};

/**
 * Asks for some answers, and does something with them only when it is submitted: typing in a field
 * changes nothing. On submit the answers go into their values of the app, and then the form's
 * actions run, so that a workflow is given what was answered. A form that is missing a required
 * answer says which, and does nothing.
 */
export const FormNode = ({ node }: { node: AppNodeOfType<'form'> }) => {
  const state = useStateValues();
  const run = useActionRunner(node.id);
  const { availability } = useWorkflowRunner();
  const baseId = useId();
  /** What was typed, by value. A field that was not typed in shows the value as the app has it. */
  const [typed, setTyped] = useState<Readonly<Record<string, string>>>({});
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const [dropped, setDropped] = useState<string[]>([]);

  const answerTo = ({ bind }: FormField): string => typed[bind] ?? String(state[bind] ?? '');

  const runsWorkflow = node.onSubmit.some(({ type }) => type === 'runWorkflow');
  const unavailableReason = runsWorkflow && !availability.canRun ? availability.reason : undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (unavailableReason !== undefined) return;

    const answers = node.fields.map((field) => ({ field, answer: answerTo(field).trim() }));
    const empty = answers.filter(({ field, answer }) => field.required && answer === '');
    setMissing(new Set(empty.map(({ field }) => field.bind)));
    if (empty.length > 0) return;

    setDropped(
      run([
        ...answers.map(({ field, answer }) => ({
          type: 'setState' as const,
          key: field.bind,
          value: answer,
        })),
        ...node.onSubmit,
      ])
    );
  };

  return (
    <div data-node-id={node.id}>
      <EuiForm component="form" noValidate onSubmit={submit} data-test-subj="customAppForm">
        {node.fields.map((field, index) => {
          const id = `${baseId}-${index}`;
          const isInvalid = missing.has(field.bind) && answerTo(field).trim() === '';
          return (
            <EuiFormRow
              key={field.bind}
              id={id}
              label={field.label}
              labelAppend={
                field.required ? (
                  <EuiText size="xs" color="subdued">
                    {requiredLabel}
                  </EuiText>
                ) : undefined
              }
              isInvalid={isInvalid}
              error={
                isInvalid
                  ? i18n.translate('xpack.customApp.formNode.requiredError', {
                      defaultMessage: 'This is needed to continue.',
                    })
                  : undefined
              }
              fullWidth
            >
              <FieldInput
                field={field}
                id={id}
                value={answerTo(field)}
                isInvalid={isInvalid}
                onChange={(next) => {
                  setTyped((current) => ({ ...current, [field.bind]: next }));
                }}
              />
            </EuiFormRow>
          );
        })}
        <EuiFormRow hasEmptyLabelSpace fullWidth>
          <EuiToolTip content={unavailableReason}>
            <EuiButton
              fill
              type="submit"
              isDisabled={unavailableReason !== undefined}
              data-test-subj="customAppFormSubmit"
            >
              {node.submitLabel}
            </EuiButton>
          </EuiToolTip>
        </EuiFormRow>
      </EuiForm>
      <DroppedActions reasons={dropped} onDismiss={() => setDropped([])} />
    </div>
  );
};
