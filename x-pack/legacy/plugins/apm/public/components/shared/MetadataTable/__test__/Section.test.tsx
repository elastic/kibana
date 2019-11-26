/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import 'jest-dom/extend-expect';
import { render } from 'react-testing-library';
import { Section } from '../Section';
import { expectTextsInDocument } from '../../../../utils/testHelpers';

describe('Section', () => {
  it('shows "empty state message" if no data is available', () => {
    const component = render(<Section keyValuePairs={[]} />);
    expectTextsInDocument(component, ['No data available']);
  });
});
