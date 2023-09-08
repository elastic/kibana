/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TITLE, TO_CHECK_INDICES_ON_REMOTE_CLUSTERS } from './translations';
import { RemoteClustersCallout } from '.';

describe('RemoteClustersCallout', () => {
  test('it renders the expected content', () => {
    render(<RemoteClustersCallout />);

    expect(screen.getByTestId('remoteClustersCallout')).toHaveTextContent(
      `${TITLE}${TO_CHECK_INDICES_ON_REMOTE_CLUSTERS}`
    );
  });
});
