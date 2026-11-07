/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CaseAccessMode } from '../../../../common/types/domain';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from '../translations';

interface Props {
  selectedOptionKeys: CaseAccessMode[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
}

const options: Array<MultiSelectFilterOption<string, CaseAccessMode>> = [
  { key: CaseAccessMode.DEFAULT, label: i18n.ACCESS_EVERYONE },
  { key: CaseAccessMode.RESTRICTED, label: i18n.ACCESS_RESTRICTED },
];

const AccessFilterComponent: React.FC<Props> = ({ selectedOptionKeys, onChange }) => (
  <MultiSelectFilter<string, CaseAccessMode>
    buttonLabel={i18n.ACCESS}
    id={'access'}
    onChange={onChange}
    options={options}
    selectedOptionKeys={selectedOptionKeys}
    isLoading={false}
  />
);

AccessFilterComponent.displayName = 'AccessFilterComponent';

export const AccessFilter = React.memo(AccessFilterComponent);
