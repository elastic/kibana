/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiFieldSearch, EuiFormRow } from '@elastic/eui';
import { MAX_STATE_STRING_LENGTH, type AppNodeOfType } from '@kbn/custom-app-common';
import { useBoundInput } from './use_bound_input';

/** How long typing pauses before the text is applied. Enter applies it at once. */
export const SEARCH_DEBOUNCE_MS = 300;

export const SearchNode = ({ node }: { node: AppNodeOfType<'search'> }) => {
  const { value, change } = useBoundInput(node);
  const [text, setText] = useState(value);
  // The last value the box and the state agreed on, so neither is re-applied needlessly.
  const applied = useRef(value);

  const apply = useCallback(
    (next: string) => {
      if (next === applied.current) return;
      applied.current = next;
      change(next);
    },
    [change]
  );

  // The state changed from elsewhere, for example another action: follow it.
  useEffect(() => {
    if (value !== applied.current) {
      applied.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => apply(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, apply]);

  return (
    <EuiFormRow label={node.label} data-node-id={node.id}>
      <EuiFieldSearch
        compressed
        fullWidth
        isClearable
        value={text}
        maxLength={MAX_STATE_STRING_LENGTH}
        placeholder={node.placeholder}
        aria-label={node.label}
        onChange={(event) => setText(event.target.value)}
        onSearch={apply}
      />
    </EuiFormRow>
  );
};
