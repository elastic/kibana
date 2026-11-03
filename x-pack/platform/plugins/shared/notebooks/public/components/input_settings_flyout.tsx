/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { DropdownOptionsSource, InputDefinition } from '../../common/types';
import { useNotebook } from './notebook_context';

type ConfigurableInput = Extract<InputDefinition, { kind: 'dropdown' | 'range' }>;
type DropdownInput = Extract<InputDefinition, { kind: 'dropdown' }>;
type RangeInput = Extract<InputDefinition, { kind: 'range' }>;

interface FieldsProps<T> {
  draft: T;
  onChange: (draft: ConfigurableInput) => void;
}

const RANGE_FIELD_LABELS = {
  min: i18n.translate('xpack.notebook.inputSettings.rangeMin', { defaultMessage: 'Min' }),
  max: i18n.translate('xpack.notebook.inputSettings.rangeMax', { defaultMessage: 'Max' }),
  step: i18n.translate('xpack.notebook.inputSettings.rangeStep', { defaultMessage: 'Step' }),
} as const;

const STATIC_OPTIONS_LABEL = i18n.translate('xpack.notebook.inputSettings.staticOptions', {
  defaultMessage: 'Options',
});

const getRangeError = ({ min, max, step }: RangeInput): string | undefined => {
  if (min >= max) {
    return i18n.translate('xpack.notebook.inputSettings.rangeOrderError', {
      defaultMessage: 'Min must be less than max.',
    });
  }
  if (step !== undefined && step <= 0) {
    return i18n.translate('xpack.notebook.inputSettings.rangeStepError', {
      defaultMessage: 'Step must be greater than 0.',
    });
  }
  return undefined;
};

const isComplete = (draft: ConfigurableInput): boolean => {
  if (draft.kind === 'range') return getRangeError(draft) === undefined;
  return draft.optionsSource !== 'cell' || Boolean(draft.optionsCell);
};

type OptionsTab = 'dynamic' | 'static';

const OPTIONS_TABS: ReadonlyArray<{ id: OptionsTab; label: string }> = [
  {
    id: 'dynamic',
    label: i18n.translate('xpack.notebook.inputSettings.tabDynamic', {
      defaultMessage: 'Dynamic',
    }),
  },
  {
    id: 'static',
    label: i18n.translate('xpack.notebook.inputSettings.tabStatic', {
      defaultMessage: 'Static',
    }),
  },
];

/** Select value for the custom options query; cell ids are UUIDs, so it cannot collide. */
const CUSTOM_QUERY = 'customQuery';

/** The source a tab switches to, returning to the dynamic source the draft last used. */
const getTabSource = (tab: OptionsTab, { optionsCell }: DropdownInput): DropdownOptionsSource => {
  if (tab === 'static') return 'static';
  return optionsCell ? 'cell' : 'query';
};

const QueryOptionsFields = ({ draft, onChange }: FieldsProps<DropdownInput>) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.notebook.inputSettings.optionsQuery', {
      defaultMessage: 'Options query',
    })}
  >
    <EuiTextArea
      fullWidth
      rows={8}
      value={draft.optionsQuery}
      onChange={(event) => onChange({ ...draft, optionsQuery: event.target.value })}
      css={css`
        font-family: monospace;
      `}
      data-test-subj="notebookInputSettingsOptionsQuery"
    />
  </EuiFormRow>
);

const StaticOptionsFields = ({ draft, onChange }: FieldsProps<DropdownInput>) => {
  const staticOptions = draft.staticOptions ?? [];
  const addStaticOption = (value: string) => {
    const option = value.trim();
    if (option && !staticOptions.includes(option)) {
      onChange({ ...draft, staticOptions: [...staticOptions, option] });
    }
  };

  return (
    <EuiFormRow
      fullWidth
      label={STATIC_OPTIONS_LABEL}
      helpText={i18n.translate('xpack.notebook.inputSettings.staticOptionsHelp', {
        defaultMessage: 'Type a value and press Enter to add it.',
      })}
    >
      <EuiComboBox
        fullWidth
        noSuggestions
        selectedOptions={staticOptions.map((option) => ({ label: option }))}
        onCreateOption={addStaticOption}
        onChange={(selected) =>
          onChange({ ...draft, staticOptions: selected.map(({ label }) => label) })
        }
        aria-label={STATIC_OPTIONS_LABEL}
        data-test-subj="notebookInputSettingsStaticOptions"
      />
    </EuiFormRow>
  );
};

const ColumnSelect = ({
  columns,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & { columns: readonly string[] }) => {
  const { optionsColumn = null } = draft;
  const choices =
    optionsColumn && !columns.includes(optionsColumn) ? [optionsColumn, ...columns] : columns;

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.notebook.inputSettings.optionsColumn', {
        defaultMessage: 'Column',
      })}
    >
      <EuiSelect
        fullWidth
        disabled={choices.length === 0}
        hasNoInitialSelection={choices.length === 0}
        value={optionsColumn ?? choices[0] ?? ''}
        options={choices.map((choice) => ({ value: choice, text: choice }))}
        onChange={({ target: { value } }) => onChange({ ...draft, optionsColumn: value })}
        data-test-subj="notebookInputSettingsOptionsColumn"
      />
    </EuiFormRow>
  );
};

/** Columns of an ES|QL cell's latest results; keyed by cell id so it subscribes to the right runtime. */
const CellColumnSelect = ({
  cellId,
  ...props
}: FieldsProps<DropdownInput> & { cellId: string }) => {
  const { store } = useNotebook();
  const { output } = useStateFromPublishingSubject(store.getRuntime$(cellId));
  const columns = output?.kind === 'table' ? output.table.columns.map(({ name }) => name) : [];
  return <ColumnSelect {...props} columns={columns} />;
};

/** Columns from the dropdown's own last options query run. */
const QueryColumnSelect = ({
  cellId,
  ...props
}: FieldsProps<DropdownInput> & { cellId: string }) => {
  const { store } = useNotebook();
  const { output } = useStateFromPublishingSubject(store.getRuntime$(cellId));
  return <ColumnSelect {...props} columns={output?.kind === 'input' ? output.columns ?? [] : []} />;
};

const DynamicOptionsFields = ({
  cellId,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & { cellId: string }) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const esqlCells = Object.values(cells).filter(({ type }) => type === 'esql');
  const isCell = draft.optionsSource === 'cell';
  const { optionsCell = null } = draft;
  const source = isCell && optionsCell !== null ? cells[optionsCell] : undefined;

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.notebook.inputSettings.optionsSource', {
          defaultMessage: 'Source',
        })}
      >
        <EuiSelect
          fullWidth
          value={isCell ? optionsCell ?? '' : CUSTOM_QUERY}
          options={[
            {
              value: CUSTOM_QUERY,
              text: i18n.translate('xpack.notebook.inputSettings.customQuery', {
                defaultMessage: 'Custom ES|QL query',
              }),
            },
            ...esqlCells.map(({ id, name }) => ({ value: id, text: name })),
          ]}
          onChange={({ target: { value } }) =>
            onChange(
              value === CUSTOM_QUERY
                ? { ...draft, optionsSource: 'query', optionsCell: null, optionsColumn: null }
                : {
                    ...draft,
                    optionsSource: 'cell',
                    optionsCell: value,
                    optionsColumn: value === optionsCell ? draft.optionsColumn : null,
                  }
            )
          }
          data-test-subj="notebookInputSettingsOptionsSource"
        />
      </EuiFormRow>
      {!isCell && <QueryOptionsFields draft={draft} onChange={onChange} />}
      {source ? (
        <CellColumnSelect key={source.id} cellId={source.id} draft={draft} onChange={onChange} />
      ) : (
        <QueryColumnSelect cellId={cellId} draft={draft} onChange={onChange} />
      )}
    </>
  );
};

const DropdownFields = ({
  cellId,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & { cellId: string }) => {
  const tab: OptionsTab = draft.optionsSource === 'static' ? 'static' : 'dynamic';
  return (
    <>
      <EuiTabs size="s">
        {OPTIONS_TABS.map(({ id, label }) => (
          <EuiTab
            key={id}
            isSelected={tab === id}
            onClick={() =>
              id !== tab && onChange({ ...draft, optionsSource: getTabSource(id, draft) })
            }
            data-test-subj={`notebookInputSettingsTab-${id}`}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {tab === 'dynamic' ? (
        <DynamicOptionsFields cellId={cellId} draft={draft} onChange={onChange} />
      ) : (
        <StaticOptionsFields draft={draft} onChange={onChange} />
      )}
    </>
  );
};

const RangeFields = ({ draft, onChange }: FieldsProps<RangeInput>) => {
  const error = getRangeError(draft);
  return (
    <EuiFormRow fullWidth isInvalid={error !== undefined} error={error}>
      <EuiFlexGroup gutterSize="s">
        {(['min', 'max', 'step'] as const).map((key) => (
          <EuiFlexItem key={key}>
            <EuiFormRow label={RANGE_FIELD_LABELS[key]}>
              <EuiFieldNumber
                value={draft[key] ?? ''}
                isInvalid={error !== undefined}
                onChange={({ target: { value } }) =>
                  onChange({
                    ...draft,
                    [key]: key === 'step' && value === '' ? undefined : Number(value),
                  })
                }
                data-test-subj={`notebookInputSettings-${key}`}
              />
            </EuiFormRow>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

/** Edits an input's definition; changes apply only when the user confirms. */
export const InputSettingsFlyout = ({
  cellId,
  name,
  input,
  onApply,
  onClose,
}: {
  cellId: string;
  name: string;
  input: ConfigurableInput;
  onApply: (input: ConfigurableInput) => void;
  onClose: () => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'notebookInputSettings' });
  const [draft, setDraft] = useState<ConfigurableInput>(input);

  return (
    <EuiFlyout
      ownFocus
      size="s"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookInputSettingsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.notebook.inputSettings.title', {
              defaultMessage: 'Edit {name}',
              values: { name },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {draft.kind === 'dropdown' ? (
          <DropdownFields cellId={cellId} draft={draft} onChange={setDraft} />
        ) : (
          <RangeFields draft={draft} onChange={setDraft} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.notebook.inputSettings.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isDisabled={!isComplete(draft)}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              data-test-subj="notebookInputSettingsApply"
            >
              {i18n.translate('xpack.notebook.inputSettings.apply', { defaultMessage: 'Apply' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
