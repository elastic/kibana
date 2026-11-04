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
  EuiDualRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { debounce } from 'lodash';
import type { InputCellDefinition, InputDefinition } from '../../common/types';
import { getCellDisplayName } from '../model/references';
import type { InputValue } from '../model/types';
import { CellFrame } from './cell_frame';
import { InputSettingsFlyout } from './input_settings_flyout';
import { useNotebook } from './notebook_context';

const RANGE_DEBOUNCE_MS = 300;

const useInputCell = (cell: InputCellDefinition) => {
  const { store } = useNotebook();
  const inputValues = useStateFromPublishingSubject(store.inputValues$);
  return {
    value: inputValues[cell.id],
    setValue: (value: InputValue) => store.setInputValue(cell.id, value),
  };
};

const DropdownControl = ({ cell }: { cell: InputCellDefinition }) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const { value, setValue } = useInputCell(cell);
  const options = runtime.output?.kind === 'input' ? runtime.output.options ?? [] : [];
  const selected = value?.kind === 'dropdown' ? value.value : null;

  return (
    <EuiComboBox
      compressed
      singleSelection={{ asPlainText: true }}
      placeholder={i18n.translate('xpack.notebook.inputCell.dropdownPlaceholder', {
        defaultMessage: 'Any (binds null)',
      })}
      isLoading={runtime.status === 'running'}
      options={options.map((option) => ({ label: option }))}
      selectedOptions={selected === null ? [] : [{ label: selected }]}
      onChange={([choice]) => setValue({ kind: 'dropdown', value: choice?.label ?? null })}
      aria-label={getCellDisplayName(cell)}
      css={{ maxWidth: 400 }}
      data-test-subj={`notebookDropdown-${cell.name}`}
    />
  );
};

const RangeControl = ({
  cell,
  input,
}: {
  cell: InputCellDefinition;
  input: Extract<InputDefinition, { kind: 'range' }>;
}) => {
  const { store } = useNotebook();
  const { value, setValue } = useInputCell(cell);
  const committed = value?.kind === 'range' ? value.value : null;
  const [local, setLocal] = useState<[number, number]>(committed ?? [input.min, input.max]);
  const commit = useMemo(
    () =>
      debounce(
        (next: [number, number]) => store.setInputValue(cell.id, { kind: 'range', value: next }),
        RANGE_DEBOUNCE_MS
      ),
    [store, cell.id]
  );

  useEffect(() => () => commit.cancel(), [commit]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem css={{ maxWidth: 480 }}>
        <EuiDualRange
          compressed
          showInput
          min={input.min}
          max={input.max}
          step={input.step ?? 1}
          value={local}
          onChange={([min, max]) => {
            const next: [number, number] = [Number(min), Number(max)];
            setLocal(next);
            commit(next);
          }}
          aria-label={getCellDisplayName(cell)}
          data-test-subj={`notebookRange-${cell.name}`}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          isDisabled={committed === null}
          onClick={() => {
            commit.cancel();
            setLocal([input.min, input.max]);
            setValue({ kind: 'range', value: null });
          }}
        >
          {i18n.translate('xpack.notebook.inputCell.clear', { defaultMessage: 'Clear' })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TIME_REFRESH_TOOLTIP = i18n.translate('xpack.notebook.inputCell.timeRefreshTooltip', {
  defaultMessage: 'Run cells that use this time range',
});

const TimeControl = ({ cell }: { cell: InputCellDefinition }) => {
  const { scheduler } = useNotebook();
  const { value, setValue } = useInputCell(cell);
  if (value?.kind !== 'time') return null;
  return (
    <EuiSuperDatePicker
      compressed
      width="auto"
      start={value.range.from}
      end={value.range.to}
      onTimeChange={({ start, end }) => setValue({ kind: 'time', range: { from: start, to: end } })}
      onRefresh={() => scheduler.refresh([cell.id])}
      showUpdateButton="iconOnly"
      updateButtonProps={{ toolTipProps: { content: TIME_REFRESH_TOOLTIP } }}
    />
  );
};

/** The control a user sets an input's value with. */
export const InputControl = ({ cell }: { cell: InputCellDefinition }) => {
  const { input } = cell;
  switch (input.kind) {
    case 'dropdown':
      return <DropdownControl cell={cell} />;
    case 'range':
      return <RangeControl cell={cell} input={input} />;
    case 'time':
      return <TimeControl cell={cell} />;
  }
};

export const InputCell = ({ cell }: { cell: InputCellDefinition }) => {
  const { store } = useNotebook();
  const runtime = useStateFromPublishingSubject(store.getRuntime$(cell.id));
  const [isEditing, setIsEditing] = useState(false);
  const { input } = cell;
  const configurable = input.kind === 'dropdown' || input.kind === 'range' ? input : undefined;

  return (
    <CellFrame
      cell={cell}
      runtime={runtime}
      headerActions={
        configurable && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="pencil"
              onClick={() => setIsEditing(true)}
              data-test-subj="notebookInputEdit"
            >
              {i18n.translate('xpack.notebook.inputCell.edit', { defaultMessage: 'Edit' })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )
      }
    >
      {isEditing && configurable && (
        <InputSettingsFlyout
          cellId={cell.id}
          name={getCellDisplayName(cell)}
          input={configurable}
          onApply={(next) =>
            store.updateCell(cell.id, (current) =>
              current.type === 'input' ? { ...current, input: next } : current
            )
          }
          onClose={() => setIsEditing(false)}
        />
      )}
      <InputControl cell={cell} />
    </CellFrame>
  );
};
