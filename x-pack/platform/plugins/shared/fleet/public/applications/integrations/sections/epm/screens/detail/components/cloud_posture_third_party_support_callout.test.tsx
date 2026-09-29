/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';

import useLocalStorage from 'react-use/lib/useLocalStorage';

import type { PackageInfo } from '../../../../../../../../common';

import { CloudPostureThirdPartySupportCallout } from './cloud_posture_third_party_support_callout';

vi.mock('react-use/lib/useLocalStorage');

describe('CloudPostureThirdPartySupportCallout', () => {
  const mockPackageInfo = { name: 'wiz' } as PackageInfo;

  beforeEach(() => {
    (useLocalStorage as Mock).mockClear();
  });

  it('renders callout when package is wiz and callout is not dismissed', () => {
    (useLocalStorage as Mock).mockReturnValue([false, vi.fn()]);

    render(<CloudPostureThirdPartySupportCallout packageInfo={mockPackageInfo} />);

    expect(screen.getByText(/New! Starting from version 2.0/)).toBeInTheDocument();
  });

  it('does not render callout when package is not wiz', () => {
    const nonWizPackageInfo = { name: 'other' } as PackageInfo;
    render(<CloudPostureThirdPartySupportCallout packageInfo={nonWizPackageInfo} />);

    expect(screen.queryByText(/New! Starting from version 2.0/)).not.toBeInTheDocument();
  });

  it('does not render callout when it has been dismissed', () => {
    (useLocalStorage as Mock).mockReturnValue([true, vi.fn()]);

    render(<CloudPostureThirdPartySupportCallout packageInfo={mockPackageInfo} />);

    expect(screen.queryByText(/New! Starting from version 2.0/)).not.toBeInTheDocument();
  });
});
