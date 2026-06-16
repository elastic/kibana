/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';
import { useDescriptionStyles } from './use_description_styles';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

describe('useDescriptionStyles', () => {
  it('returns all expected style keys', () => {
    const { result } = renderHook(() => useDescriptionStyles(), { wrapper });

    expect(result.current).toEqual(
      expect.objectContaining({
        title: expect.anything(),
        preview: expect.anything(),
        header: expect.anything(),
        editIcon: expect.anything(),
        content: expect.anything(),
        unsavedDraft: expect.anything(),
      })
    );
  });

  it('returns stable references on re-render', () => {
    const { result, rerender } = renderHook(() => useDescriptionStyles(), { wrapper });

    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
