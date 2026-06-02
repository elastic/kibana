/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup } from '@elastic/eui';
import React, { useMemo } from 'react';

import { labels } from '../constants/i18n';
import type { ApplicationConnectionsViewMode } from '../constants/types';

export interface ViewModeToggleProps {
  viewMode: ApplicationConnectionsViewMode;
  onChange: (viewMode: ApplicationConnectionsViewMode) => void;
}

export const ViewModeToggle = ({ viewMode, onChange }: ViewModeToggleProps) => {
  const options = useMemo<EuiButtonGroupOptionProps[]>(
    () => [
      {
        id: 'grouped',
        label: labels.viewMode.grouped,
        iconType: 'indexMapping',
        'data-test-subj': 'applicationConnectionsViewModeGrouped',
        iconSide: 'right',
      },
      {
        id: 'list',
        label: labels.viewMode.list,
        iconType: 'list',
        'data-test-subj': 'applicationConnectionsViewModeList',
        iconSide: 'right',
      },
    ],
    []
  );

  return (
    <EuiButtonGroup
      legend={labels.viewMode.legend}
      idSelected={viewMode}
      onChange={(id) => onChange(id as ApplicationConnectionsViewMode)}
      options={options}
      data-test-subj="applicationConnectionsViewModeToggle"
      buttonSize="m"
    />
  );
};
