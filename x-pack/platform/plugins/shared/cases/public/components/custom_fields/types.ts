/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiTableComputedColumnType } from '@elastic/eui';

import type { CaseCustomField, CustomFieldTypes } from '../../../common/types/domain';
import type {
  CasesConfigurationUICustomField,
  CaseUI,
  CaseUICustomField,
} from '../../containers/types';

export interface CustomFieldType<T extends CaseUICustomField> {
  Configure: React.FC;
  View: React.FC<{
    customField?: T;
  }>;
  Edit: React.FC<{
    customField?: T;
    customFieldConfiguration: CasesConfigurationUICustomField;
    onSubmit: (customField: T) => void;
    isLoading: boolean;
    canUpdate: boolean;
    /**
     * `classic` — pencil + view mode (legacy case view).
     * `inline` — label/value row with an edit affordance, matching the template fields section
     * (redesign case view).
     */
    editVariant?: 'classic' | 'inline';
    /**
     * `inline` only: the section (not this field) owns edit mode — every field in the section
     * switches to its editable form together, the same way the template fields section works.
     * Ignored for `classic`, which keeps its own always-independent per-field edit state.
     */
    isSectionEditing?: boolean;
    /** `inline` only: requests that the whole section enter edit mode. */
    onRequestSectionEdit?: () => void;
  }>;
  Create: React.FC<{
    customFieldConfiguration: CasesConfigurationUICustomField;
    isLoading: boolean;
    setAsOptional?: boolean;
    setDefaultValue?: boolean;
  }>;
}

export interface CustomFieldFactoryFilterOption {
  key: string;
  label: string;
  value: boolean | null;
}

export type CustomFieldEuiTableColumn = Omit<EuiTableComputedColumnType<CaseUI>, 'render'> & {
  render: EuiTableComputedColumnType<CaseCustomField>['render'];
};

export type CustomFieldFactory<T extends CaseUICustomField> = () => {
  id: string;
  label: string;
  getEuiTableColumn: (params: { label: string }) => CustomFieldEuiTableColumn;
  build: () => CustomFieldType<T>;
  filterOptions?: CustomFieldFactoryFilterOption[];
  getDefaultValue?: () => string | boolean | null;
  convertNullToEmpty?: (value: string | number | boolean | null) => string;
};

export type CustomFieldBuilderMap = {
  readonly [key in CustomFieldTypes]: CustomFieldFactory<CaseUICustomField>;
};
