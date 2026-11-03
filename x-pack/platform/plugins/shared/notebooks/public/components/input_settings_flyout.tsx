/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { DropdownOptionsSource, InputDefinition } from '../../common/types';
import { LazyEsqlEditor } from './lazy_esql_editor';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

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

interface QueryRun {
  query: string;
  columns: readonly string[];
}

/** The custom options query, with a Run action that previews the draft query's columns. */
const QueryOptionsFields = ({
  cellId,
  savedQuery,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & DynamicOptionsProps) => {
  const { store, scheduler } = useNotebook();
  const { output } = useStateFromPublishingSubject(store.getRuntime$(cellId));
  const [preview, setPreview] = useState<QueryRun>();
  const [error, setError] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);
  const controller = useRef<AbortController>();
  useEffect(() => () => controller.current?.abort(), []);

  const lastRun: QueryRun = preview ?? {
    query: savedQuery,
    columns: output?.kind === 'input' ? output.columns ?? [] : [],
  };
  const isQueryChanged = draft.optionsQuery !== lastRun.query;

  const run = async () => {
    const { optionsQuery } = draft;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setIsRunning(true);
    try {
      const { table } = await scheduler.previewQuery(optionsQuery, current.signal);
      if (current.signal.aborted) return;
      setPreview({ query: optionsQuery, columns: table.columns.map(({ name }) => name) });
      setError(undefined);
    } catch (runError) {
      if (current.signal.aborted) return;
      setPreview({ query: optionsQuery, columns: [] });
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      if (!current.signal.aborted) setIsRunning(false);
    }
  };

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.notebook.inputSettings.optionsQuery', {
          defaultMessage: 'Options query',
        })}
        labelAppend={
          <EuiButtonEmpty
            size="xs"
            iconType="play"
            isLoading={isRunning}
            isDisabled={!draft.optionsQuery.trim()}
            onClick={run}
            data-test-subj="notebookInputSettingsRunQuery"
          >
            {i18n.translate('xpack.notebook.inputSettings.runQuery', { defaultMessage: 'Run' })}
          </EuiButtonEmpty>
        }
      >
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazyEsqlEditor
            query={{ esql: draft.optionsQuery }}
            onTextLangQueryChange={({ esql }) => onChange({ ...draft, optionsQuery: esql })}
            onTextLangQuerySubmit={run}
            isLoading={isRunning}
            editorIsInline
            hideRunQueryButton
            hideQueryHistory
            hideQuickSearch
            disableAutoFocus
            expandToFitQueryOnMount
            dataTestSubj="notebookInputSettingsOptionsQuery"
          />
        </Suspense>
      </EuiFormRow>
      {error && !isQueryChanged && (
        <>
          <KbnDangerCallout
            announceOnMount
            size="s"
            title={error}
            data-test-subj="notebookInputSettingsQueryError"
          />
          <EuiSpacer size="s" />
        </>
      )}
      <ColumnSelect
        columns={lastRun.columns}
        isDisabled={isQueryChanged}
        draft={draft}
        onChange={onChange}
      />
    </>
  );
};

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
  isDisabled = false,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & { columns: readonly string[]; isDisabled?: boolean }) => {
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
        disabled={isDisabled || choices.length === 0}
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

interface DynamicOptionsProps {
  cellId: string;
  /** The applied options query, which the cell's latest results come from. */
  savedQuery: string;
}

const DynamicOptionsFields = ({
  cellId,
  savedQuery,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & DynamicOptionsProps) => {
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
      {!isCell && (
        <QueryOptionsFields
          cellId={cellId}
          savedQuery={savedQuery}
          draft={draft}
          onChange={onChange}
        />
      )}
      {source && (
        <CellColumnSelect key={source.id} cellId={source.id} draft={draft} onChange={onChange} />
      )}
      {isCell && !source && <ColumnSelect columns={[]} draft={draft} onChange={onChange} />}
    </>
  );
};

const DropdownFields = ({
  cellId,
  savedQuery,
  draft,
  onChange,
}: FieldsProps<DropdownInput> & DynamicOptionsProps) => {
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
        <DynamicOptionsFields
          cellId={cellId}
          savedQuery={savedQuery}
          draft={draft}
          onChange={onChange}
        />
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
    <NotebookFlyout
      ownFocus
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
          <DropdownFields
            cellId={cellId}
            savedQuery={input.kind === 'dropdown' ? input.optionsQuery : ''}
            draft={draft}
            onChange={setDraft}
          />
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
    </NotebookFlyout>
  );
};
