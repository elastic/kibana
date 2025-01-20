/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { VisualizationContainer } from './visualization_container';
import { render, screen } from '@testing-library/react';

describe('VisualizationContainer', () => {
  const renderVisContainer = (props?: React.HTMLAttributes<HTMLDivElement>) => {
    return render(<VisualizationContainer {...props}>Hello!</VisualizationContainer>);
  };
  test('renders child content', () => {
    renderVisContainer();
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  test('renders style', () => {
    renderVisContainer({ style: { color: 'blue' } });
    expect(screen.getByText('Hello!')).toHaveStyle({ color: 'blue' });
  });

  test('combines class names with container class', () => {
    renderVisContainer({ className: 'myClass' });
    expect(screen.getByText('Hello!')).toHaveClass('myClass lnsVisualizationContainer');
  });
});
