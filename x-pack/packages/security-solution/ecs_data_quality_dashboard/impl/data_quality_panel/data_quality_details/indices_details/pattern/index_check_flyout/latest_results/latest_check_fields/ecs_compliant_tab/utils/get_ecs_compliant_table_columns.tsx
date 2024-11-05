/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTableFieldDataColumnType } from '@elastic/eui';

import { CodeSuccess } from '../../../../../../../../styles';
import { AllowedValue, EcsCompliantFieldMetadata } from '../../../../../../../../types';
import { FIELD } from '../../../../../../../../translations';
import { EcsAllowedValues } from '../../../../ecs_allowed_values';
import { ECS_MAPPING_TYPE, ECS_VALUES } from '../translations';
import { ECS_DESCRIPTION } from '../../../../translations';

export const getEcsCompliantTableColumns = (): Array<
  EuiTableFieldDataColumnType<EcsCompliantFieldMetadata>
> => [
  {
    field: 'indexFieldName',
    name: FIELD,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'type',
    name: ECS_MAPPING_TYPE,
    render: (type: string) => <CodeSuccess data-test-subj="type">{type}</CodeSuccess>,
    sortable: true,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'allowed_values',
    name: ECS_VALUES,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '25%',
  },
  {
    field: 'description',
    name: ECS_DESCRIPTION,
    render: (description: string) => <span data-test-subj="description">{description}</span>,
    sortable: false,
    truncateText: false,
    width: '35%',
  },
];
