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
  if (draft.optionsSource !== 'cell') return true;
  return Boolean(draft.optionsCell && draft.optionsColumn);
};

const OPTIONS_SOURCE_TABS: ReadonlyArray<{ id: DropdownOptionsSource; label: string }> = [
  {
    id: 'query',
    label: i18n.translate('xpack.notebook.inputSettings.sourceQuery', {
      defaultMessage: 'ES|QL query',
    }),
  },
  {
    id: 'static',
    label: i18n.translate('xpack.notebook.inputSettings.sourceStatic', {
      defaultMessage: 'Static values',
    }),
  },
  {
    id: 'cell',
    label: i18n.translate('xpack.notebook.inputSettings.sourceCell', {
      defaultMessage: 'Cell column',
    }),
  },
];

const QueryOptionsFields = ({ draft, onChange }: FieldsProps<DropdownInput>) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.notebook.inputSettings.optionsQuery', {
      defaultMessage: 'Options query (first column)',
    })}
    helpText={i18n.translate('xpack.notebook.inputSettings.optionsQueryHelp', {
      defaultMessage: 'ES|QL; may reference ?_tstart and ?_tend.',
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

/** Lists the columns of a cell's latest results; keyed by cell id so it subscribes to the right runtime. */
const ColumnSelect = ({
  cellId,
  cellName,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & { cellId: string; cellName: string }) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cellId));
  const columns = runtime.output?.kind === 'table' ? runtime.output.table.columns : [];
  const names = columns.map(({ name }) => name);
  const { optionsColumn = null } = draft;
  const choices =
    optionsColumn && !names.includes(optionsColumn) ? [optionsColumn, ...names] : names;

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.notebook.inputSettings.optionsColumn', {
        defaultMessage: 'Column',
      })}
      helpText={
        columns.length === 0
          ? i18n.translate('xpack.notebook.inputSettings.optionsColumnEmpty', {
              defaultMessage: 'Run {cell} to list its columns.',
              values: { cell: cellName },
            })
          : i18n.translate('xpack.notebook.inputSettings.optionsColumnHelp', {
              defaultMessage: 'Its distinct values become the options.',
            })
      }
    >
      <EuiSelect
        fullWidth
        hasNoInitialSelection={!optionsColumn}
        value={optionsColumn ?? ''}
        options={choices.map((choice) => ({ value: choice, text: choice }))}
        onChange={(event) => onChange({ ...draft, optionsColumn: event.target.value })}
        data-test-subj="notebookInputSettingsOptionsColumn"
      />
    </EuiFormRow>
  );
};

const CellOptionsFields = ({ draft, onChange }: FieldsProps<DropdownInput>) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const esqlCells = Object.values(cells).filter(({ type }) => type === 'esql');
  const { optionsCell = null } = draft;
  const source = optionsCell === null ? undefined : cells[optionsCell];

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.notebook.inputSettings.optionsCell', {
          defaultMessage: 'ES|QL cell',
        })}
      >
        <EuiSelect
          fullWidth
          hasNoInitialSelection={!optionsCell}
          value={optionsCell ?? ''}
          options={esqlCells.map(({ id, name }) => ({ value: id, text: name }))}
          onChange={(event) =>
            onChange({ ...draft, optionsCell: event.target.value, optionsColumn: null })
          }
          data-test-subj="notebookInputSettingsOptionsCell"
        />
      </EuiFormRow>
      {source && (
        <ColumnSelect
          key={source.id}
          cellId={source.id}
          cellName={source.name}
          draft={draft}
          onChange={onChange}
        />
      )}
    </>
  );
};

const DropdownFields = ({ draft, onChange }: FieldsProps<DropdownInput>) => {
  const source = draft.optionsSource ?? 'query';
  return (
    <>
      <EuiTabs size="s">
        {OPTIONS_SOURCE_TABS.map(({ id, label }) => (
          <EuiTab
            key={id}
            isSelected={source === id}
            onClick={() => onChange({ ...draft, optionsSource: id })}
            data-test-subj={`notebookInputSettingsSource-${id}`}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {source === 'query' && <QueryOptionsFields draft={draft} onChange={onChange} />}
      {source === 'static' && <StaticOptionsFields draft={draft} onChange={onChange} />}
      {source === 'cell' && <CellOptionsFields draft={draft} onChange={onChange} />}
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
  name,
  input,
  onApply,
  onClose,
}: {
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
          <DropdownFields draft={draft} onChange={setDraft} />
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
