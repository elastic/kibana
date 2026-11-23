/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ChangeEvent, KeyboardEvent } from 'react';
import React, { useCallback, useEffect } from 'react';
import { MAX_KI_SEARCH_QUERY_LENGTH } from '../../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

/** Wait after the last keystroke before the search runs. */
export const LIST_KI_SEARCH_DEBOUNCE_MS = 300;

interface ListKiSearchBoxProps {
  value: string;
  isLoading?: boolean;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
}

export const ListKiSearchBox = ({
  value,
  isLoading = false,
  onChange,
  onCommit,
}: ListKiSearchBoxProps) => {
  // Search as the user types, after a short pause.
  useEffect(() => {
    const timeoutId = setTimeout(() => onCommit(value), LIST_KI_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [onCommit, value]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    [onChange]
  );

  // Enter searches right away. Read the DOM value, the `value` prop can be one render behind.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onCommit(event.currentTarget.value);
      }
    },
    [onCommit]
  );

  return (
    <EuiFieldSearch
      fullWidth
      incremental={false}
      isClearable
      isLoading={isLoading}
      maxLength={MAX_KI_SEARCH_QUERY_LENGTH}
      placeholder={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.searchPlaceholder', {
        defaultMessage: 'Search by title or description',
      })}
      aria-label={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.searchLabel', {
        defaultMessage: 'Search Knowledge documents',
      })}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      data-test-subj="contextListKiSearchBox"
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.listKi.SEARCH,
      })}
    />
  );
};
