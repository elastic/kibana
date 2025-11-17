/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResilientFieldMetadata } from './types';
import type { EnhancedFieldMetaData, GetFieldsData } from './use_get_fields';

export const resilientFields: ResilientFieldMetadata[] = [
  {
    name: 'name',
    input_type: 'text',
    read_only: false,
    values: [],
    required: null,
    text: '',
    internal: true,
    prefix: null,
  },
  {
    name: 'description',
    input_type: 'textarea',
    read_only: false,
    values: [],
    required: null,
    text: 'Description',
    internal: true,
    prefix: null,
  },
  {
    name: 'severity_code',
    input_type: 'select',
    read_only: false,
    values: [
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 4,
        label: 'Low',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 5,
        label: 'Medium',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 6,
        label: 'High',
      },
    ],
    required: null,
    text: '',
    internal: true,
    prefix: null,
  },
  {
    name: 'incident_type_ids',
    input_type: 'multiselect',
    read_only: false,
    values: [
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 19,
        label: 'Malware',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 21,
        label: 'Denial of Service',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 12,
        label: 'Communication error (fax; email)',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 16,
        label: 'Custom type',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 1001,
        label: 'Custom type 2',
      },
    ],
    required: null,
    text: '',
    internal: true,
    prefix: null,
  },
  {
    name: 'customField1',
    input_type: 'text',
    read_only: false,
    values: [],
    required: null,
    text: 'Custom Field 1',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_text',
    input_type: 'text',
    read_only: false,
    values: [],
    required: null,
    text: 'Test text',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_text_area',
    input_type: 'textarea',
    read_only: false,
    values: [],
    required: null,
    text: 'Test textarea',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_boolean',
    input_type: 'boolean',
    read_only: false,
    values: [],
    required: null,
    text: 'Test boolean',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_date_picker',
    input_type: 'datepicker',
    read_only: false,
    values: [],
    required: null,
    text: 'Test datepicker',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_date_time_picker',
    input_type: 'datetimepicker',
    read_only: false,
    values: [],
    required: null,
    text: 'Test datetimepicker',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_number',
    input_type: 'number',
    read_only: false,
    values: [],
    required: null,
    text: 'Test number',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_select',
    input_type: 'select',
    read_only: false,
    values: [
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 100,
        label: 'Option 1',
      },
      {
        default: true,
        enabled: true,
        hidden: false,
        value: 110,
        label: 'Option 2',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 120,
        label: 'Option 3',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 130,
        label: 'Option 4',
      },
    ],
    required: null,
    text: 'Test select',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'test_multi_select',
    input_type: 'multiselect',
    read_only: false,
    values: [
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 100,
        label: 'Option 1',
      },
      {
        default: true,
        enabled: true,
        hidden: false,
        value: 110,
        label: 'Option 2',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 120,
        label: 'Option 3',
      },
      {
        default: false,
        enabled: true,
        hidden: false,
        value: 130,
        label: 'Option 4',
      },
    ],
    required: null,
    text: 'Test multiselect',
    internal: false,
    prefix: 'properties',
  },
  {
    name: 'resolution_summary',
    input_type: 'textarea',
    read_only: false,
    values: [],
    required: null,
    text: 'Resolution summary',
    internal: true,
    prefix: null,
  },
];

const responseData = resilientFields.reduce<GetFieldsData>(
  (preparedData, currentField) => {
    const preparedField: EnhancedFieldMetaData = {
      ...currentField,
      label: currentField.text,
      value: currentField.name,
    };
    preparedData.fieldsObj[currentField.name] = preparedField;
    preparedData.fields.push(preparedField);
    return preparedData;
  },
  { fields: [], fieldsObj: {} }
);
export const useGetFieldsResponse = {
  isLoading: false,
  isFetching: false,
  data: {
    data: responseData,
  },
};
