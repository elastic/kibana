/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render, screen } from '@testing-library/react';
import { CategoryViewer } from './category_viewer_component';

describe('Category viewer ', () => {
  const sampleCategory = 'foobar';

  it('renders category', () => {
    render(<CategoryViewer category={sampleCategory} />);

    expect(screen.getByTestId(`category-viewer-${sampleCategory}`)).toHaveTextContent(
      sampleCategory
    );
  });
});
