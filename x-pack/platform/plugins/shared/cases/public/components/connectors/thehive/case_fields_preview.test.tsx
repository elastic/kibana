/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import FieldsPreview from './case_fields_preview';

import { theHiveConnector } from '../mock';
import { renderWithTestingProviders } from '../../../common/mock';
import { createQueryWithMarkup } from '../../../common/test_utils';

describe('TheHive Fields: Preview', () => {
  const fields = {
    tlp: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    renderWithTestingProviders(<FieldsPreview connector={theHiveConnector} fields={fields} />);

    const getByTextWithMarkup = createQueryWithMarkup(screen.getByText);
    expect(getByTextWithMarkup('TLP: GREEN')).toBeInTheDocument();
  });
});
