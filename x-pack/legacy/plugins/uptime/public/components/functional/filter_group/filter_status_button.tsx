/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton } from '@elastic/eui';
import React from 'react';
import { useUrlParams } from '../../../hooks';

export interface FilterStatusButtonProps {
  content: string;
  value: string;
  withNext: boolean;
}

export const FilterStatusButton = ({ content, value, withNext }: FilterStatusButtonProps) => {
  const [getUrlParams, setUrlParams] = useUrlParams();
  const { statusFilter: urlValue } = getUrlParams();
  return (
    <EuiFilterButton
      hasActiveFilters={urlValue === value}
      onClick={() => {
        if (urlValue === value) {
          setUrlParams({ statusFilter: '' });
        } else {
          setUrlParams({ statusFilter: value });
        }
      }}
      withNext={withNext}
    >
      {content}
    </EuiFilterButton>
  );
};
