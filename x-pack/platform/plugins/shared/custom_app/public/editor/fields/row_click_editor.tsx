/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  setStateDeclaration,
  stateKeyForColumn,
  updateNode,
  type Action,
  type AppDocument,
} from '@kbn/custom-app-common';
import { ListRow, SelectField, TextField } from './fields';

type SetState = Extract<Action, { type: 'setState' }>;

interface RememberedColumn {
  column: string;
  key: string;
}

const isRemembered = (action: Action): action is SetState & { value: { fromColumn: string } } =>
  action.type === 'setState' && typeof action.value === 'object' && 'fromColumn' in action.value;

/**
 * What a row click does, as an author sees it: it remembers some columns of the row, and may open
 * a flyout. Each column becomes a value named after it, so a query can use it as ?column_name.
 * Whatever else the actions hold is kept as it is.
 */
export const RowClickEditor = ({
  nodeId,
  actions,
  document,
  flyoutIds,
  onEdit,
}: {
  nodeId: string;
  actions: readonly Action[];
  document: AppDocument;
  flyoutIds: readonly string[];
  onEdit: (change: (document: AppDocument) => AppDocument, coalesceKey?: string) => void;
}) => {
  // Rows added but not named yet. They are not actions until they have a column.
  const [blankRows, setBlankRows] = useState(0);

  const remembered: RememberedColumn[] = actions
    .filter(isRemembered)
    .map(({ key, value }) => ({ key, column: value.fromColumn }));
  const others = actions.filter((action) => !isRemembered(action) && action.type !== 'openFlyout');
  const flyout = actions.find((action) => action.type === 'openFlyout');
  const flyoutId = flyout?.type === 'openFlyout' ? flyout.flyout : '';

  /** Rebuilds the actions from the pieces, which keeps the order the runtime needs. */
  const apply = (next: { remembered: RememberedColumn[]; flyout: string }, declare?: string) =>
    onEdit((current) => {
      const withValue =
        declare === undefined || declare in current.state
          ? current
          : setStateDeclaration(current, declare, { type: 'string', default: '' });
      const result = updateNode<'table'>(withValue, nodeId, {
        onRowClick: [
          ...next.remembered.map(
            ({ key, column }): Action => ({ type: 'setState', key, value: { fromColumn: column } })
          ),
          ...others,
          ...(next.flyout === '' ? [] : [{ type: 'openFlyout' as const, flyout: next.flyout }]),
        ],
      });
      return result.ok ? result.document : current;
    });

  const rename = (index: number, column: string) => {
    if (column.trim() === '') return;
    const key = stateKeyForColumn(document, column);
    apply(
      {
        remembered: remembered.map((row, at) => (at === index ? { column, key } : row)),
        flyout: flyoutId,
      },
      key
    );
  };

  const addNamed = (column: string) => {
    if (column.trim() === '') return;
    const key = stateKeyForColumn(document, column);
    setBlankRows((count) => Math.max(0, count - 1));
    apply({ remembered: [...remembered, { column, key }], flyout: flyoutId }, key);
  };

  return (
    <>
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('xpack.customApp.editor.rowClickHelp', {
            defaultMessage:
              'Remember columns of the clicked row, then use them in queries as ?column_name.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {remembered.map(({ column, key }, index) => (
        <RememberedRow
          key={`${index}:${key}`}
          position={index + 1}
          column={column}
          valueName={key}
          onCommit={(next) => rename(index, next)}
          onRemove={() =>
            apply({ remembered: remembered.filter((_row, at) => at !== index), flyout: flyoutId })
          }
        />
      ))}
      {Array.from({ length: blankRows }, (_unused, index) => (
        <RememberedRow
          key={`blank:${index}`}
          position={remembered.length + index + 1}
          column=""
          onCommit={addNamed}
          onRemove={() => setBlankRows((count) => Math.max(0, count - 1))}
        />
      ))}
      <EuiButtonEmpty
        size="s"
        iconType="plusCircle"
        onClick={() => setBlankRows((count) => count + 1)}
      >
        {i18n.translate('xpack.customApp.editor.rememberColumn', {
          defaultMessage: 'Remember a column',
        })}
      </EuiButtonEmpty>
      <EuiSpacer size="s" />
      <SelectField
        label={i18n.translate('xpack.customApp.editor.thenOpenFlyout', {
          defaultMessage: 'Then open a flyout',
        })}
        value={flyoutId}
        options={[
          {
            value: '',
            text: i18n.translate('xpack.customApp.editor.noFlyout', { defaultMessage: 'None' }),
          },
          ...flyoutIds.map((id) => ({ value: id, text: id })),
        ]}
        onChange={(next) => apply({ remembered, flyout: next })}
      />
    </>
  );
};

/** One column. What is typed is acted on when the author leaves the field, not at each key. */
const RememberedRow = ({
  position,
  column,
  valueName,
  onCommit,
  onRemove,
}: {
  position: number;
  column: string;
  valueName?: string;
  onCommit: (column: string) => void;
  onRemove: () => void;
}) => {
  const [draft, setDraft] = useState(column);

  return (
    <ListRow
      removeLabel={i18n.translate('xpack.customApp.editor.forgetColumn', {
        defaultMessage: 'Forget column {position}',
        values: { position },
      })}
      onRemove={onRemove}
    >
      <TextField
        label={i18n.translate('xpack.customApp.editor.rememberedColumn', {
          defaultMessage: 'Column {position}',
          values: { position },
        })}
        value={draft}
        helpText={valueName === undefined ? undefined : `?${valueName}`}
        onChange={setDraft}
        onBlur={() => draft !== column && onCommit(draft)}
      />
    </ListRow>
  );
};
