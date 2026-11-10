/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import type { CatalogueArrayField } from '@kbn/streams-schema';
import { DraggableStepWrapper, DragHandle, useListReorderMonitor } from '../../draggable_steps';
import { FieldControl } from '../field_control';
import { toControlId } from '../field_helpers';
import { FieldList } from '../field_list';
import { useDefinitionFormContext } from '../form_context';
import {
  allowsItemTelemetry,
  createInitialItem,
  ITEM_TELEMETRY_KEY,
  readItemScope,
} from '../serialize';
import { useRowKeys } from '../use_row_keys';
import { isObjectValue, joinPointer, type FormValue, type ObjectValue } from '../values';
import { RemoveButton } from './remove_button';
import { SignalPicker } from './signal_picker';

/** Cap for arrays whose catalogue definition sets no `max_items`. */
const DEFAULT_MAX_ARRAY_ITEMS = 5;

const removeItemLabel = i18n.translate('xpack.streams.componentDefinitionForm.array.remove', {
  defaultMessage: 'Remove item',
});

function ItemTelemetry({
  value,
  onChange,
  pointer,
}: {
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  pointer: string;
}) {
  const { telemetry, errors } = useDefinitionFormContext();
  return (
    <SignalPicker
      label={i18n.translate('xpack.streams.componentDefinitionForm.array.itemTelemetry', {
        defaultMessage: 'Applies to',
      })}
      helpText={i18n.translate('xpack.streams.componentDefinitionForm.array.itemTelemetryHelp', {
        defaultMessage: 'Leave empty to apply to every signal.',
      })}
      options={telemetry}
      selected={readItemScope(value)}
      error={errors[pointer]}
      onChange={(signals) => onChange(signals.length > 0 ? signals : undefined)}
      dataTestSubj="componentDefinitionFormItemTelemetry"
    />
  );
}

interface ArrayControlProps {
  field: CatalogueArrayField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  pointer: string;
}

/** A sortable list of items, laid out like the processing editor's Grok pattern list. */
export function ArrayControl({ field, value, onChange, pointer }: ArrayControlProps) {
  const context = useDefinitionFormContext();
  const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const rowKeys = useRowKeys(items.length);
  const canRemove = items.length > (field.min_items ?? 0);
  const maxItems = field.max_items ?? DEFAULT_MAX_ARRAY_ITEMS;
  const canAdd = items.length < maxItems;
  // An item that already has a scope keeps its picker, so a scope the processor's signals no
  // longer cover can still be fixed.
  const showItemTelemetry = (item: ObjectValue) =>
    allowsItemTelemetry(field) &&
    (context.telemetry.length > 1 || readItemScope(item[ITEM_TELEMETRY_KEY]).length > 0);

  const setItem = (index: number, item: FormValue | undefined) =>
    onChange(items.map((current, position) => (position === index ? item ?? '' : current)));
  const remove = (index: number) => {
    rowKeys.remove(index);
    onChange(items.filter((_, position) => position !== index));
  };
  const move = (from: number, to: number) => {
    rowKeys.move(from, to);
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  const add = () => {
    const item = createInitialItem(field.items, context);
    onChange([...items, item ?? (field.items.type === 'object' ? {} : '')]);
  };

  const listId = toControlId(`${context.idPrefix}-rows`, pointer);
  const rowIds = rowKeys.keys.map((key) => `${listId}-${key}`);
  useListReorderMonitor(rowIds, move);
  const isDragEnabled = items.length > 1;

  return (
    <div>
      {items.length > 0 ? (
        <EuiPanel color="subdued" paddingSize="m" hasShadow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {items.map((item, index) => {
              const itemPointer = joinPointer(pointer, index);
              const objectItem = isObjectValue(item) ? item : {};
              return (
                <EuiFlexItem key={rowIds[index]} grow={false}>
                  <DraggableStepWrapper
                    stepId={rowIds[index]}
                    index={index}
                    level={0}
                    isBlocked
                    isDragEnabled={isDragEnabled}
                  >
                    <EuiFlexGroup
                      gutterSize="s"
                      responsive={false}
                      alignItems={field.items.type === 'object' ? 'flexStart' : 'center'}
                      data-test-subj="componentDefinitionFormArrayItem"
                    >
                      {isDragEnabled ? (
                        <EuiFlexItem grow={false}>
                          <DragHandle />
                        </EuiFlexItem>
                      ) : null}
                      <EuiFlexItem
                        css={css`
                          min-width: 0;
                        `}
                      >
                        {field.items.type === 'object' ? (
                          <EuiPanel hasShadow={false} paddingSize="m">
                            <FieldList
                              fields={field.items.fields}
                              choiceGroups={field.items.choice_groups}
                              value={objectItem}
                              onChange={(next) => setItem(index, next)}
                              pointer={itemPointer}
                            />
                            {showItemTelemetry(objectItem) ? (
                              <ItemTelemetry
                                pointer={joinPointer(itemPointer, ITEM_TELEMETRY_KEY)}
                                value={objectItem[ITEM_TELEMETRY_KEY]}
                                onChange={(signals) => {
                                  const rest = omit(objectItem, ITEM_TELEMETRY_KEY);
                                  setItem(
                                    index,
                                    signals === undefined
                                      ? rest
                                      : { ...rest, [ITEM_TELEMETRY_KEY]: signals }
                                  );
                                }}
                              />
                            ) : null}
                          </EuiPanel>
                        ) : (
                          <FieldControl
                            field={field.items}
                            value={item}
                            onChange={(next) => setItem(index, next)}
                            pointer={itemPointer}
                            scope={{}}
                            required
                          />
                        )}
                      </EuiFlexItem>
                      {canRemove ? (
                        <EuiFlexItem grow={false}>
                          <RemoveButton
                            label={removeItemLabel}
                            onClick={() => remove(index)}
                            dataTestSubj="componentDefinitionFormArrayRemove"
                          />
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                  </DraggableStepWrapper>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </EuiPanel>
      ) : null}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            size="s"
            isDisabled={!canAdd}
            onClick={add}
            data-test-subj={`componentDefinitionFormArrayAdd-${field.name ?? 'items'}`}
          >
            {i18n.translate('xpack.streams.componentDefinitionForm.array.add', {
              defaultMessage: 'Add item',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {canAdd ? null : (
          <EuiFlexItem grow={false}>
            <EuiText
              size="xs"
              color="subdued"
              data-test-subj={`componentDefinitionFormArrayLimit-${field.name ?? 'items'}`}
            >
              {i18n.translate('xpack.streams.componentDefinitionForm.array.limitReached', {
                defaultMessage: 'You can add up to {max, plural, one {# item} other {# items}}.',
                values: { max: maxItems },
              })}
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
}
