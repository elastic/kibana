/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import FieldsPreview from './case_fields_preview';
import type { AppMockRenderer } from '../../../common/mock';
import { theHiveConnector } from '../mock';
import { createAppMockRenderer } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';

describe('TheHive Fields: Preview', () => {
  const fields = {
    tlp: 1,
  };

  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    appMockRenderer.render(<FieldsPreview connector={theHiveConnector} fields={fields} />);

    const getByText = createQueryWithMarkup(screen.getByText);
    expect(getByText('TLP: GREEN')).toBeInTheDocument();
  });
});
