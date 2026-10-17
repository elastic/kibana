/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_WORKFLOW_ID_LENGTH, MAX_WORKFLOW_INPUTS, type Action } from '@kbn/custom-app-common';
import { getServices } from '../../services';
import { createWorkflowClient, type WorkflowSummary } from '../../workflows/workflow_client';
import { FormRow, IconButton, SelectField, TextField } from './fields';

type RunWorkflowAction = Extract<Action, { type: 'runWorkflow' }>;
type InputSource = RunWorkflowAction['inputs'][string];

const LIST_SIZE = 20;
const SEARCH_DELAY_MS = 300;

const labels = {
  workflow: i18n.translate('xpack.customApp.editor.workflow', { defaultMessage: 'Workflow' }),
  inputName: (position: number) =>
    i18n.translate('xpack.customApp.editor.workflowInputName', {
      defaultMessage: 'Input name {position}',
      values: { position },
    }),
  inputKind: (position: number) =>
    i18n.translate('xpack.customApp.editor.workflowInputKind', {
      defaultMessage: 'Input {position} comes from',
      values: { position },
    }),
  inputValue: (position: number) =>
    i18n.translate('xpack.customApp.editor.workflowInputValue', {
      defaultMessage: 'Input {position} value',
      values: { position },
    }),
};

type Kind = 'value' | 'state';

const kindOf = (source: InputSource): Kind =>
  typeof source === 'object' && source !== null && 'fromState' in source ? 'state' : 'value';

/**
 * Picks a workflow by name from those the user can see. Someone who may run workflows but not list
 * them can still type an id, so the picker is a convenience and not a requirement.
 */
const WorkflowPicker = ({
  workflow,
  onChange,
}: {
  workflow: string;
  onChange: (id: string) => void;
}) => {
  const client = useMemo(() => createWorkflowClient(getServices().core.http), []);
  const [search, setSearch] = useState('');
  const [found, setFound] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cannotList, setCannotList] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    // A short wait, so that typing does not ask for a list per letter.
    const timeout = setTimeout(() => {
      client
        .list({ query: search || undefined, size: LIST_SIZE })
        .then(({ results }) => isCurrent && setFound(results))
        .catch(() => isCurrent && setCannotList(true))
        .finally(() => isCurrent && setIsLoading(false));
    }, SEARCH_DELAY_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [client, search]);

  if (cannotList) {
    return (
      <TextField
        label={labels.workflow}
        value={workflow}
        maxLength={MAX_WORKFLOW_ID_LENGTH}
        helpText={i18n.translate('xpack.customApp.editor.workflowIdHelp', {
          defaultMessage:
            'The workflows cannot be listed for you, so give the id of the workflow, as Workflows shows it.',
        })}
        onChange={onChange}
      />
    );
  }

  const options: Array<EuiComboBoxOptionOption<string>> = found.map(({ id, name, enabled }) => ({
    key: id,
    label: name,
    value: id,
    disabled: !enabled,
    append: enabled ? undefined : (
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.customApp.editor.workflowDisabled', { defaultMessage: 'Disabled' })}
      </EuiText>
    ),
  }));
  const selected = workflow
    ? [
        options.find(({ value }) => value === workflow) ?? {
          key: workflow,
          label: workflow,
          value: workflow,
        },
      ]
    : [];

  return (
    <FormRow
      label={labels.workflow}
      helpText={i18n.translate('xpack.customApp.editor.workflowHelp', {
        defaultMessage: 'It runs with the privileges of whoever presses the button.',
      })}
    >
      <EuiComboBox<string>
        compressed
        fullWidth
        isClearable={false}
        isLoading={isLoading}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selected}
        onSearchChange={setSearch}
        onChange={([option]) => option?.value !== undefined && onChange(option.value)}
        aria-label={labels.workflow}
        placeholder={i18n.translate('xpack.customApp.editor.workflowPlaceholder', {
          defaultMessage: 'Search workflows',
        })}
        data-test-subj="customAppWorkflowPicker"
      />
    </FormRow>
  );
};

interface InputRowProps {
  position: number;
  name: string;
  source: InputSource;
  stateKeys: readonly string[];
  onChange: (name: string, source: InputSource) => void;
  onRemove: () => void;
}

const InputRow = ({ position, name, source, stateKeys, onChange, onRemove }: InputRowProps) => {
  const kind = kindOf(source);
  const stateKey = typeof source === 'object' && 'fromState' in source ? source.fromState : '';

  return (
    <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false} wrap>
      <EuiFlexItem css={{ minWidth: 120 }}>
        <FormRow label={labels.inputName(position)}>
          <EuiFieldText
            compressed
            fullWidth
            value={name}
            aria-label={labels.inputName(position)}
            onChange={(event) => onChange(event.target.value, source)}
          />
        </FormRow>
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 120 }}>
        <SelectField<Kind>
          label={labels.inputKind(position)}
          value={kind}
          options={[
            {
              value: 'value',
              text: i18n.translate('xpack.customApp.editor.inputKindValue', {
                defaultMessage: 'A fixed value',
              }),
            },
            {
              value: 'state',
              text: i18n.translate('xpack.customApp.editor.inputKindState', {
                defaultMessage: 'A value of the app',
              }),
            },
          ]}
          onChange={(next) =>
            onChange(name, next === 'state' ? { fromState: stateKeys[0] ?? '' } : '')
          }
        />
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 120 }}>
        {kind === 'state' ? (
          <SelectField
            label={labels.inputValue(position)}
            value={stateKey}
            placeholder={i18n.translate('xpack.customApp.editor.inputChooseValue', {
              defaultMessage: 'Choose a value',
            })}
            options={stateKeys.map((key) => ({ value: key, text: key }))}
            onChange={(key) => onChange(name, { fromState: key })}
          />
        ) : (
          <TextField
            label={labels.inputValue(position)}
            value={String(source)}
            onChange={(value) => onChange(name, value)}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <IconButton
          iconType="trash"
          color="danger"
          label={i18n.translate('xpack.customApp.editor.removeWorkflowInput', {
            defaultMessage: 'Remove input {position}',
            values: { position },
          })}
          onClick={onRemove}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ButtonActionsEditorProps {
  actions: readonly Action[];
  /** The values of the app, which an input of the workflow can take. */
  stateKeys: readonly string[];
  onChange: (actions: Action[]) => void;
}

/**
 * What a button does when it is pressed. It edits the workflow it runs, and leaves whatever else
 * the button does, which an agent may have written, as it is.
 */
export const ButtonActionsEditor = ({ actions, stateKeys, onChange }: ButtonActionsEditorProps) => {
  const index = actions.findIndex(({ type }) => type === 'runWorkflow');
  const action = index === -1 ? undefined : (actions[index] as RunWorkflowAction);
  const others = actions.length - (action ? 1 : 0);

  const replace = (next: RunWorkflowAction | undefined) =>
    onChange(
      next
        ? actions.map((current, position) => (position === index ? next : current))
        : actions.filter((_current, position) => position !== index)
    );

  if (!action) {
    return (
      <>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.customApp.editor.buttonDoesNothing', {
              defaultMessage: 'This button does nothing yet.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          size="s"
          iconType="plus"
          onClick={() => onChange([...actions, { type: 'runWorkflow', workflow: '', inputs: {} }])}
          data-test-subj="customAppAddWorkflowAction"
        >
          {i18n.translate('xpack.customApp.editor.runWorkflow', {
            defaultMessage: 'Run a workflow',
          })}
        </EuiButtonEmpty>
      </>
    );
  }

  const entries = Object.entries(action.inputs);
  const setInputs = (next: Array<[string, InputSource]>) =>
    replace({ ...action, inputs: Object.fromEntries(next) });

  return (
    <>
      <WorkflowPicker
        workflow={action.workflow}
        onChange={(workflow) => replace({ ...action, workflow })}
      />
      <EuiSpacer size="m" />
      <EuiText size="xs">
        <strong>
          {i18n.translate('xpack.customApp.editor.workflowInputs', {
            defaultMessage: 'What it is given',
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      {entries.map(([name, source], position) => (
        <React.Fragment key={position}>
          <InputRow
            position={position + 1}
            name={name}
            source={source}
            stateKeys={stateKeys}
            onChange={(nextName, nextSource) =>
              setInputs(
                entries.map((entry, at) => (at === position ? [nextName, nextSource] : entry))
              )
            }
            onRemove={() => setInputs(entries.filter((_entry, at) => at !== position))}
          />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="plus"
            isDisabled={entries.length >= MAX_WORKFLOW_INPUTS}
            onClick={() => setInputs([...entries, [nextName(entries), '']])}
            data-test-subj="customAppAddWorkflowInput"
          >
            {i18n.translate('xpack.customApp.editor.addWorkflowInput', {
              defaultMessage: 'Add an input',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="danger"
            iconType="trash"
            onClick={() => replace(undefined)}
            data-test-subj="customAppRemoveWorkflowAction"
          >
            {i18n.translate('xpack.customApp.editor.removeWorkflowAction', {
              defaultMessage: 'Do not run a workflow',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {others > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate('xpack.customApp.editor.otherActions', {
                defaultMessage:
                  'This button also does {count, plural, one {# other thing} other {# other things}}, which are kept as they are.',
                values: { count: others },
              })}
            </p>
          </EuiText>
        </>
      )}
    </>
  );
};

/** A name that no input has yet, so that adding one does not replace another. */
const nextName = (entries: ReadonlyArray<[string, unknown]>): string => {
  const taken = new Set(entries.map(([name]) => name));
  let position = entries.length + 1;
  while (taken.has(`input${position}`)) position++;
  return `input${position}`;
};
