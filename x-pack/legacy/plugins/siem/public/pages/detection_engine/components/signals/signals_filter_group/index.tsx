/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import * as i18n from '../translations';

export const FILTER_OPEN = 'open';
export const FILTER_CLOSED = 'closed';
export type SignalFilterOption = typeof FILTER_OPEN | typeof FILTER_CLOSED;

export const SignalsTableFilterGroup = React.memo(
  ({
    onFilterGroupChanged,
  }: {
    onFilterGroupChanged: (filterGroup: SignalFilterOption) => void;
  }) => {
    const [filterGroup, setFilterGroup] = useState(FILTER_OPEN);

    const onClickOpenFilterCallback = useCallback(() => {
      setFilterGroup(FILTER_OPEN);
      onFilterGroupChanged(FILTER_OPEN);
    }, [setFilterGroup, onFilterGroupChanged]);

    const onClickCloseFilterCallback = useCallback(() => {
      setFilterGroup(FILTER_CLOSED);
      onFilterGroupChanged(FILTER_CLOSED);
    }, [setFilterGroup, onFilterGroupChanged]);

    return (
      <EuiFilterGroup>
        <EuiFilterButton
          hasActiveFilters={filterGroup === FILTER_OPEN}
          onClick={onClickOpenFilterCallback}
          withNext
        >
          {i18n.OPEN_SIGNALS}
        </EuiFilterButton>

        <EuiFilterButton
          hasActiveFilters={filterGroup === FILTER_CLOSED}
          onClick={onClickCloseFilterCallback}
        >
          {i18n.CLOSED_SIGNALS}
        </EuiFilterButton>
      </EuiFilterGroup>
    );
  }
);
