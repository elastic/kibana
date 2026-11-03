/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { KeyboardEvent } from 'react';
import React, { useCallback } from 'react';
import { MAX_KI_SEARCH_QUERY_LENGTH } from '../../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { ListKiSearchSubmitButton } from './list_ki_search_submit_button';

interface ListKiSearchBoxProps {
  value: string;
  submittedQuery: string;
  isLoading?: boolean;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onSubmitClick: () => void;
}

export const ListKiSearchBox = ({
  value,
  submittedQuery,
  isLoading = false,
  onChange,
  onCommit,
  onSubmitClick,
}: ListKiSearchBoxProps) => {
  const searchPlaceholder = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.listKi.searchPlaceholder',
    {
      defaultMessage: 'Search',
    }
  );

  const submitLabel = i18n.translate(
    'xpack.contextEngine.aiIndexDetail.listKi.searchSubmitButton',
    {
      defaultMessage: 'Search',
    }
  );

  const searchEbtProps = getEbtProps({
    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
    action: CONTEXT_ENGINE_UI_EBT.action.listKi.SEARCH,
  });

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
    [onChange]
  );

  // Read the DOM value directly rather than closing over `value`, so this fires correctly
  // even if the parent hasn't re-rendered with the latest `value` prop yet.
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
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
      <EuiFlexItem>
        <EuiFieldSearch
          compressed
          fullWidth
          incremental={false}
          isClearable
          isLoading={isLoading}
          maxLength={MAX_KI_SEARCH_QUERY_LENGTH}
          placeholder={searchPlaceholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          data-test-subj="contextListKiSearchBox"
          {...searchEbtProps}
        />
      </EuiFlexItem>

      <ListKiSearchSubmitButton
        tooltip={submitLabel}
        disabled={value.trim() === submittedQuery}
        isLoading={isLoading}
        onClick={onSubmitClick}
        data-test-subj="contextListKiSearchSubmitButton"
        ebtProps={searchEbtProps}
      />
    </EuiFlexGroup>
  );
};
