/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createIntegrationsTestRendererMock } from '../../../mock';

import { DefaultLayout } from './default';

function renderLayout(search: string) {
  const renderer = createIntegrationsTestRendererMock();
  renderer.mountHistory.push(`/browse${search}`);
  return renderer.render(
    <DefaultLayout section="browse">
      <div>child</div>
    </DefaultLayout>
  );
}

describe('DefaultLayout return params', () => {
  it('does not render Back to selection without return params', () => {
    const { queryByText } = renderLayout('');
    expect(queryByText('Back to selection')).not.toBeInTheDocument();
  });

  it('renders Back to selection when both return params are present', () => {
    const { getByText } = renderLayout('?returnAppId=observabilityOnboarding&returnPath=%3F');
    expect(getByText('Back to selection')).toBeInTheDocument();
  });

  it('still renders Back to selection on view=manage', () => {
    const { getByText } = renderLayout(
      '?view=manage&returnAppId=observabilityOnboarding&returnPath=%3F'
    );
    expect(getByText('Back to selection')).toBeInTheDocument();
  });

  it('keeps return params on Browse and Installed tab hrefs', () => {
    const { getByRole } = renderLayout('?returnAppId=observabilityOnboarding&returnPath=%3F');
    expect(getByRole('tab', { name: 'Browse integrations' })).toHaveAttribute(
      'href',
      expect.stringContaining('returnAppId=observabilityOnboarding')
    );
    expect(getByRole('tab', { name: 'Installed integrations' })).toHaveAttribute(
      'href',
      expect.stringContaining('returnAppId=observabilityOnboarding')
    );
  });
});
