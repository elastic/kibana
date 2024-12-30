/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';

import type { PivotAggsConfig } from '../../../../common';

import type { AggListProps } from './list_form';
import { AggListForm } from './list_form';

describe('Transform: <AggListForm />', () => {
  test('Minimal initialization', () => {
    const item: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const props: AggListProps = {
      list: { 'the-agg': item },
      options: {},
      deleteHandler() {},
      onChange() {},
    };

    const { container } = render(<AggListForm {...props} />);

    expect(container.textContent).toBe('the-group-by-agg-name');
  });
});
