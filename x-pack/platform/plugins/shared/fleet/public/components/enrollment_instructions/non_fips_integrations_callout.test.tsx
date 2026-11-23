/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { NonFipsIntegrationsCallout } from './non_fips_integrations_callout';

jest.mock('../../hooks', () => ({
  useStartServices: () => ({
    docLinks: { links: { fleet: { fipsIngest: 'https://elastic.co/docs/fips-ingest' } } },
  }),
}));

describe('NonFipsIntegrationsCallout', () => {
  function render(nonFipsIntegrations?: Array<{ name: string; title: string }>) {
    return renderWithI18n(<NonFipsIntegrationsCallout nonFipsIntegrations={nonFipsIntegrations} />);
  }

  it('should render callout requiring root privileges', () => {
    render([{ name: 'mongodb', title: 'MongoDB' }]);

    expect(screen.getByText('FIPS mode compatibility')).toBeInTheDocument();
    expect(screen.getByTestId('nonFipsIntegrationsCallout').textContent).toContain(
      'This agent policy contains the following integrations that are not FIPS compatible. Enrolling an agent in FIPS mode might cause the agent to not ingest data properly.'
    );
    expect(screen.getByText('MongoDB')).toBeInTheDocument();
  });
});
