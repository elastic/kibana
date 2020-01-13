/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from '../../../../../../../../test_utils/enzyme_helpers';
import { BytesUsage, BytesPercentageUsage } from '../helpers';

describe('Bytes Usage', () => {
  it('should format correctly with used and max bytes', () => {
    const props = {
      usedBytes: 50,
      maxBytes: 100,
    };
    expect(renderWithIntl(<BytesUsage {...props} />)).toMatchSnapshot();
  });

  it('should format correctly with only usedBytes', () => {
    const props = {
      usedBytes: 50,
    };
    expect(renderWithIntl(<BytesUsage {...props} />)).toMatchSnapshot();
  });
});

describe('BytesPercentageUsage', () => {
  it('should format correctly with used bytes and max bytes', () => {
    const props = {
      usedBytes: 50,
      maxBytes: 100,
    };
    expect(renderWithIntl(<BytesPercentageUsage {...props} />)).toMatchSnapshot();
  });
  it('should return zero bytes if both parameters are not present', () => {
    const props = {
      usedBytes: 50,
    };
    expect(renderWithIntl(<BytesPercentageUsage {...props} />)).toMatchSnapshot();
  });
});
