/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CasesColumnSelection } from '../types';
import { ColumnsPopover } from './columns_popover';
import * as i18n from '../translations';

interface ListViewControlsProps {
  selectedFields: CasesColumnSelection[];
  onSelectedFieldsChange: (fields: CasesColumnSelection[]) => void;
}

export const ListViewControls: React.FC<ListViewControlsProps> = ({
  selectedFields,
  onSelectedFieldsChange,
}) => {
  return (
    <ColumnsPopover
      selectedColumns={selectedFields}
      onSelectedColumnsChange={onSelectedFieldsChange}
      buttonLabel={i18n.FIELDS_BUTTON_LABEL}
      buttonIconType="list"
    />
  );
};

ListViewControls.displayName = 'ListViewControls';
