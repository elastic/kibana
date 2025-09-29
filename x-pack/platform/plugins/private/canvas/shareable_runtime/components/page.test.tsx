/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Page } from './page';

describe('<Page />', () => {
  test('null workpad renders nothing', () => {
    const { container } = render(<Page index={0} />);
    expect(container.firstChild).toBeNull();
  });
});
