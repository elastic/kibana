/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { useHasRendered } from './use_has_rendered';

describe('useHasRendered', () => {
  it('is false on the first render and true after mount', async () => {
    const values: boolean[] = [];

    const Probe = () => {
      values.push(useHasRendered());
      return null;
    };

    render(React.createElement(Probe));

    expect(values[0]).toBe(false);

    await waitFor(() => {
      expect(values.at(-1)).toBe(true);
    });
  });
});
