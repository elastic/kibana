/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../mock';

import { NonFipsIntegrationsCallout } from './non_fips_integrations_callout';

describe('NonFipsIntegrationsCallout', () => {
  function render(nonFipsIntegrations?: Array<{ name: string; title: string }>) {
    const renderer = createFleetTestRendererMock();
    const results = renderer.render(
      <NonFipsIntegrationsCallout nonFipsIntegrations={nonFipsIntegrations} />
    );

    return results;
  }

  it('should render callout requiring root privileges', async () => {
    const renderResult = render([{ name: 'mongodb', title: 'MongoDB' }]);

    await waitFor(() => {
      expect(renderResult.getByText('FIPS mode compatibility')).toBeInTheDocument();
      expect(renderResult.getByTestId('nonFipsIntegrationsCallout').textContent).toContain(
        'This agent policy contains the following integrations that are not FIPS compatible. Enrolling an agent in FIPS mode might cause the agent to not ingest data properly.'
      );
      expect(renderResult.getByText('MongoDB')).toBeInTheDocument();
    });
  });
});
