/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';

import {
  VIEW_TOGGLE_LEGEND,
  VIEW_TOGGLE_LIST_LABEL,
  VIEW_TOGGLE_TABLE_LABEL,
} from '../translations';
import { VIEW_TOGGLE_LIST_ID, VIEW_TOGGLE_TABLE_ID } from '../constants';
import type { ViewToggleId } from '../constants';

interface ViewToggleProps {
  idSelected: ViewToggleId;
  onChange: (id: ViewToggleId) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ idSelected, onChange }) => {
  const options: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      { id: VIEW_TOGGLE_LIST_ID, iconType: 'listBullet', label: VIEW_TOGGLE_LIST_LABEL },
      { id: VIEW_TOGGLE_TABLE_ID, iconType: 'tableDensityNormal', label: VIEW_TOGGLE_TABLE_LABEL },
    ],
    []
  );

  const handleChange = useCallback((id: string) => onChange(id as ViewToggleId), [onChange]);

  return (
    <EuiButtonGroup
      legend={VIEW_TOGGLE_LEGEND}
      options={options}
      idSelected={idSelected}
      onChange={handleChange}
      buttonSize="m"
      isIconOnly
    />
  );
};

ViewToggle.displayName = 'ViewToggle';
