/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type RenderResult, fireEvent, waitFor } from '@testing-library/react';

import type { FleetStartServices } from '../../../../../../..';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import {
  BidirectionalIntegrationsBanner,
  type BidirectionalIntegrationsBannerProps,
} from './bidirectional_integrations_callout';

jest.mock('react-use/lib/useLocalStorage');

describe('BidirectionalIntegrationsBanner', () => {
  let componentProps: BidirectionalIntegrationsBannerProps;
  let renderResult: RenderResult;
  let render: () => RenderResult;
  let storageMock: jest.Mocked<FleetStartServices['storage']>;

  beforeEach(() => {
    componentProps = { integrationPackageName: 'sentinel_one' };

    const testRunner = createFleetTestRendererMock();

    storageMock = testRunner.startServices.storage;

    render = () => {
      renderResult = testRunner.render(<BidirectionalIntegrationsBanner {...componentProps} />);
      return renderResult;
    };
  });

  it('should render bidirectional integrations banner', () => {
    render();
    expect(renderResult.getByTestId('bidirectionalIntegrationsCallout')).toBeInTheDocument();
  });

  it('should contain a link to documentation', () => {
    render();
    const docLink = renderResult.getByTestId('bidirectionalIntegrationDocLink');

    expect(docLink).toBeInTheDocument();
    expect(docLink.getAttribute('href')).toContain('third-party-response-actions');
  });

  it('should remove the callout when the dismiss button is clicked', async () => {
    render();
    fireEvent.click(renderResult.getByTestId('euiDismissCalloutButton'));

    await waitFor(() => {
      expect(storageMock.store.setItem).toHaveBeenCalledWith(
        'fleet.showSOReponseSupportBanner',
        'false'
      );
      expect(renderResult.queryByTestId('bidirectionalIntegrationsCallout')).toBeFalsy();
    });
  });

  it('should render nothing if integration is not supported', () => {
    componentProps.integrationPackageName = 'foo';
    render();

    expect(renderResult.queryByTestId('bidirectionalIntegrationsCallout')).toBeFalsy();
  });

  it('should render nothing if user had dismissed the callout in the past', () => {
    (storageMock.store.getItem as jest.Mock).mockReturnValue('false');
    render();

    expect(renderResult.queryByTestId('bidirectionalIntegrationsCallout')).toBeFalsy();
  });
});
