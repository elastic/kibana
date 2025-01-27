/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { AppearanceSelector } from './appearance_selector';

describe('AppearanceSelector', () => {
  const closePopover = jest.fn();

  it('renders correctly and toggles dark mode', () => {
    const security = securityMock.createStart();
    const core = coreMock.createStart();

    const { getByTestId } = render(
      <AppearanceSelector
        core={core}
        security={security}
        closePopover={closePopover}
        isServerless={false}
      />
    );

    const appearanceSelector = getByTestId('appearanceSelector');
    fireEvent.click(appearanceSelector);

    expect(core.overlays.openModal).toHaveBeenCalled();
  });
});
