/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { DownloadSource } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { EditDownloadSourceFlyout } from '.';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useGeneratedHtmlId: () => 'mocked-id',
}));

function renderFlyout(downloadSource?: DownloadSource) {
  const renderer = createFleetTestRendererMock();

  const comp = renderer.render(
    <EditDownloadSourceFlyout downloadSource={downloadSource} onClose={() => {}} proxies={[]} />
  );

  return { comp };
}
describe('EditDownloadSourceFlyout', () => {
  it('should render the flyout if there is no download source provided', async () => {
    const { comp } = renderFlyout();
    expect(comp.queryByLabelText('Name')).not.toBeNull();
    expect(comp.queryByLabelText('Host')).not.toBeNull();
    expect(comp.queryByPlaceholderText('Specify name')).not.toBeNull();
    expect(comp.queryByPlaceholderText('https://artifacts.elastic.co/downloads')).not.toBeNull();
  });

  it('should render the flyout if the provided download source is valid', async () => {
    const { comp } = renderFlyout({
      name: 'New Host',
      host: 'https://test-registry.co/path',
      id: 'test-ds-1',
      is_default: false,
    });
    expect(comp.queryByLabelText('Name')).not.toBeNull();
    expect(comp.queryByLabelText('Host')).not.toBeNull();
    expect(comp.queryByDisplayValue('New Host')).not.toBeNull();
    expect(comp.queryByDisplayValue('https://test-registry.co/path')).not.toBeNull();
  });
});
