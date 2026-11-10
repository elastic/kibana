/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MAX_LIST_ITEMS,
  MAX_STATE_STRING_LENGTH,
  type AppNodeOfType,
} from '@kbn/custom-app-common';
import { useBoundList } from './use_bound_list';

/** How long typing pauses before the list is applied. */
export const LIST_INPUT_DEBOUNCE_MS = 300;

/**
 * The values written in a box, one to a line: without spaces around them, without empty lines and
 * without a value twice, in the order they were first written. Each is cut to what a value can be.
 */
export const parseLines = (text: string): string[] =>
  Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim().slice(0, MAX_STATE_STRING_LENGTH))
        .filter((line) => line !== '')
    )
  );

/**
 * A box for a list of values, such as usernames, one to a line. It says how many different values
 * it holds, and uses no more than the most a list can have.
 */
export const ListInputNode = ({ node }: { node: AppNodeOfType<'list_input'> }) => {
  const { list, change } = useBoundList(node);
  const [text, setText] = useState(() => list.join('\n'));
  // The last list the box and the state agreed on, so neither is applied again for nothing.
  const applied = useRef(list);

  const values = parseLines(text);
  const isOver = values.length > MAX_LIST_ITEMS;

  const apply = useCallback(
    (next: string[]) => {
      const used = next.slice(0, MAX_LIST_ITEMS);
      if (
        used.length === applied.current.length &&
        used.every((v, i) => v === applied.current[i])
      ) {
        return;
      }
      applied.current = used;
      change(used);
    },
    [change]
  );

  // The state changed from elsewhere, such as another action: the box follows it.
  useEffect(() => {
    const same =
      list.length === applied.current.length && list.every((v, i) => v === applied.current[i]);
    if (!same) {
      applied.current = list;
      setText(list.join('\n'));
    }
  }, [list]);

  useEffect(() => {
    const timer = setTimeout(() => apply(parseLines(text)), LIST_INPUT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, apply]);

  return (
    <EuiFormRow
      label={node.label}
      data-node-id={node.id}
      fullWidth
      isInvalid={isOver}
      error={
        isOver
          ? i18n.translate('xpack.customApp.listInput.tooMany', {
              defaultMessage: 'Only the first {max} values are used.',
              values: { max: MAX_LIST_ITEMS },
            })
          : undefined
      }
      helpText={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="customAppListCount">
              {i18n.translate('xpack.customApp.listInput.count', {
                defaultMessage:
                  'one per line · {count, plural, one {# unique value} other {# unique values}} (max {max})',
                values: { count: values.length, max: MAX_LIST_ITEMS },
              })}
            </EuiText>
          </EuiFlexItem>
          {text !== '' && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="trash"
                onClick={() => {
                  setText('');
                  apply([]);
                }}
                data-test-subj="customAppListClear"
              >
                {i18n.translate('xpack.customApp.listInput.clear', { defaultMessage: 'Clear' })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    >
      <EuiTextArea
        compressed
        fullWidth
        resize="vertical"
        rows={5}
        value={text}
        placeholder={node.placeholder}
        aria-label={node.label}
        isInvalid={isOver}
        onChange={(event) => setText(event.target.value)}
        // Leaving the box applies it at once, without waiting for the pause.
        onBlur={() => apply(parseLines(text))}
      />
    </EuiFormRow>
  );
};
