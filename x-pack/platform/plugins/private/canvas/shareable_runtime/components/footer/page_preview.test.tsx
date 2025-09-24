/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { JestContext } from '../../test/context_jest';
import { PagePreview } from './page_preview';

jest.mock('../../supported_renderers');

describe('<PagePreview />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<PagePreview height={100} index={0} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders as expected', () => {
    const { container } = render(
      <JestContext>
        <PagePreview height={100} index={0} />
      </JestContext>
    );
    expect(container.textContent).toEqual('markdown mock');
  });
});
