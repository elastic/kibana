/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Download } from '.';

describe('<Download />', () => {
  test('has canvasDownload class', () => {
    const { container } = render(
      <Download fileName="hello" content="world">
        <button>Download it</button>
      </Download>
    );

    expect(container.firstChild).toHaveClass('canvasDownload');
  });
});
