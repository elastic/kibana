/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { TransformListRow } from '../../../../common';
import type { StopActionNameProps } from './stop_action_name';
import { StopActionName } from './stop_action_name';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

jest.mock('../../../../app_dependencies');

const queryClient = new QueryClient();

describe('Transform: Transform List Actions <StopAction />', () => {
  test('Minimal initialization', () => {
    // @ts-expect-error mock data is too loosely typed
    const item: TransformListRow = transformListRow;
    const props: StopActionNameProps = {
      forceDisable: false,
      items: [item],
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <StopActionName {...props} />
      </QueryClientProvider>
    );
    expect(container.textContent).toBe('Stop');
  });
});
