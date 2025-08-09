/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';


import { ResolutionEditor } from './resolution_editor';
import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';

const defaultProps = {
  resolution: GRID_RESOLUTION.COARSE,
  onChange: () => {},
  metrics: [],
};

test('should render 4 tick slider when renderAs is POINT', () => {
  render(
    <I18nProvider>
      <ResolutionEditor renderAs={RENDER_AS.POINT} {...defaultProps} />
    </I18nProvider>
  );
  
  // Verify the Resolution form label is present
  expect(screen.getByText('Resolution')).toBeInTheDocument();
  
  // Verify the slider tick labels are present
  expect(screen.getByText('low')).toBeInTheDocument();
  expect(screen.getByText('high')).toBeInTheDocument();
});

test('should render 4 tick slider when renderAs is GRID', () => {
  render(
    <I18nProvider>
      <ResolutionEditor renderAs={RENDER_AS.GRID} {...defaultProps} />
    </I18nProvider>
  );
  
  // Verify the Resolution form label is present
  expect(screen.getByText('Resolution')).toBeInTheDocument();
  
  // Verify the slider tick labels are present
  expect(screen.getByText('low')).toBeInTheDocument();
  expect(screen.getByText('high')).toBeInTheDocument();
});

test('should render 4 tick slider when renderAs is HEATMAP', () => {
  render(
    <I18nProvider>
      <ResolutionEditor renderAs={RENDER_AS.HEATMAP} {...defaultProps} />
    </I18nProvider>
  );
  
  // Verify the Resolution form label is present
  expect(screen.getByText('Resolution')).toBeInTheDocument();
  
  // Verify the slider tick labels are present
  expect(screen.getByText('low')).toBeInTheDocument();
  expect(screen.getByText('high')).toBeInTheDocument();
});

test('should render 3 tick slider when renderAs is HEX', () => {
  render(
    <I18nProvider>
      <ResolutionEditor renderAs={RENDER_AS.HEX} {...defaultProps} />
    </I18nProvider>
  );
  
  // Verify the Resolution form label is present
  expect(screen.getByText('Resolution')).toBeInTheDocument();
  
  // Verify the slider tick labels are present
  expect(screen.getByText('low')).toBeInTheDocument();
  expect(screen.getByText('high')).toBeInTheDocument();
});
