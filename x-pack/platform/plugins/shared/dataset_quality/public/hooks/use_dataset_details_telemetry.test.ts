/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { useDatasetDetailsTelemetry } from './use_dataset_details_telemetry';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { NavigationSource, NavigationTarget } from '../services/telemetry';

jest.mock('./use_dataset_quality_details_state', () => ({
  useDatasetQualityDetailsState: jest.fn(),
}));

describe('useDatasetDetailsTelemetry', () => {
  it('does not prevent navigation when telemetry props are unavailable', () => {
    const navigationCallback = jest.fn();
    const event = {} as Parameters<RouterLinkProps['onClick']>[0];
    const telemetryClient = {
      getDatasetDetailsTrackingState: jest.fn(() => 'opened'),
      trackDatasetDetailsNavigated: jest.fn(),
    };

    (useDatasetQualityDetailsState as jest.Mock).mockReturnValue({
      telemetryClient,
      dataStreamDetails: undefined,
      timeRange: undefined,
      loadingState: { dataStreamDetailsLoading: true },
      integrationDetails: {},
    });

    const { result } = renderHook(() => useDatasetDetailsTelemetry());
    const linkProps = result.current.wrapLinkPropsForTelemetry(
      { href: undefined, onClick: navigationCallback },
      NavigationTarget.Discover,
      NavigationSource.Table
    );

    expect(() => linkProps.onClick(event)).not.toThrow();
    expect(navigationCallback).toHaveBeenCalledWith(event);
    expect(telemetryClient.trackDatasetDetailsNavigated).not.toHaveBeenCalled();
  });
});
