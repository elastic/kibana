/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../../../test_utils/enzyme_helpers';
import { PageLoading } from '../';

describe('PageLoading', () => {
  test('should show a simple page loading component', () => {
    expect(renderWithIntl(<PageLoading />)).toMatchSnapshot();
  });
});
