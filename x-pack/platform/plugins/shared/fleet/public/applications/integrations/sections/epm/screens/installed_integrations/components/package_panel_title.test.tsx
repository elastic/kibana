/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import { PackagePanelTitle } from './package_panel_title';

const installedPackage = { name: 'aws', title: 'AWS', version: '1.0.0', icons: [] };

describe('PackagePanelTitle', () => {
  it('shows the package title', () => {
    createIntegrationsTestRendererMock().render(
      <PackagePanelTitle installedPackage={installedPackage} />
    );

    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.queryByTestId('packagePanelSubtitle')).not.toBeInTheDocument();
  });

  it('shows a subtitle after the package title', () => {
    createIntegrationsTestRendererMock().render(
      <PackagePanelTitle installedPackage={installedPackage} subtitle="Instances" />
    );

    expect(screen.getByTestId('packagePanelSubtitle')).toHaveTextContent('Instances');
  });
});
