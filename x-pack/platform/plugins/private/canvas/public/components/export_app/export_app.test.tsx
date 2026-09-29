/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { ExportApp } from './export_app.component';
import type { CanvasWorkpad } from '../../../types';

vi.mock('../workpad_page', () => {
      const mocked = {
      WorkpadPage: (props: any) => <div>Page</div>,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../routing', () => {
      const mocked = {
      RoutingLink: (props: any) => <div>Link</div>,
    };
      return { ...mocked, default: mocked };
    });

describe('<ExportApp />', () => {
  test('renders as expected', () => {
    const sampleWorkpad = {
      id: 'my-workpad-abcd',
      css: '',
      pages: [
        {
          elements: [0, 1, 2],
        },
        {
          elements: [3, 4, 5, 6],
        },
      ],
    } as unknown as CanvasWorkpad;

    const { container: container1 } = render(
      <ExportApp workpad={sampleWorkpad} selectedPageIndex={0} initializeWorkpad={() => {}} />
    );
    expect(container1).toMatchSnapshot();

    const { container: container2 } = render(
      <ExportApp workpad={sampleWorkpad} selectedPageIndex={1} initializeWorkpad={() => {}} />
    );
    expect(container2).toMatchSnapshot();
  });
});
