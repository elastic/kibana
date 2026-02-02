/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SessionInfoDisclaimer } from './session_info_disclaimer';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/dom';

describe('SessionInfoDisclaimer', () => {
  it('should render session info disclaimer', () => {
    renderWithI18n(<SessionInfoDisclaimer />);

    expect(screen.getByTestId('feedbackSessionInfoDisclaimer')).toBeInTheDocument();
  });
});
