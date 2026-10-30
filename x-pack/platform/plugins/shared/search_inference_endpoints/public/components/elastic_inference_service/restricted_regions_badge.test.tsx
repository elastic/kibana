/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { EisInferenceEndpoint, RegionPolicyResponse } from '../../../common/types';
import { RestrictedRegionsBadge } from './restricted_regions_badge';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const endpoints: EisInferenceEndpoint[] = [
  {
    inference_id: '.eis-test',
    task_type: 'chat_completion',
    service: 'elastic',
    service_settings: { model_id: 'test-model' },
    metadata: {
      regions: [
        { csp: 'aws', region: 'us-east-1', geo: 'us' },
        { csp: 'gcp', region: 'europe-west1', geo: 'eu' },
      ],
    },
  },
];

const geoPolicy: RegionPolicyResponse = {
  region_policy: { allowed_geos: ['eu'] },
  created_at: '2026-01-01T00:00:00Z',
};

const regionsPolicy: RegionPolicyResponse = {
  region_policy: { allowed_regions: [{ csp: 'aws', region: 'us-east-1' }] },
  created_at: '2026-01-01T00:00:00Z',
};

describe('RestrictedRegionsBadge', () => {
  const onManageRegions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderBadge = (props: Partial<React.ComponentProps<typeof RestrictedRegionsBadge>> = {}) =>
    render(
      <Wrapper>
        <RestrictedRegionsBadge policy={geoPolicy} endpoints={endpoints} {...props} />
      </Wrapper>
    );

  it('renders the Restricted regions badge', () => {
    renderBadge();
    expect(screen.getByTestId('restrictedRegionsBadge')).toHaveTextContent('Restricted regions');
  });

  it('opens a geo policy popover with selected and unselected geos', () => {
    renderBadge();
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));

    expect(screen.getByTestId('restrictedRegionsPopoverTitle')).toHaveTextContent('Region policy');
    expect(screen.getByTestId('restrictedRegionsGeoList')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('geoZoneCheckbox-eu')).getByTestId('restrictedRegionsIncludedIcon')
    ).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneCheckbox-eu')).toHaveTextContent('Europe');
    expect(
      within(screen.getByTestId('geoZoneCheckbox-us')).getByTestId('restrictedRegionsExcludedIcon')
    ).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneCheckbox-us')).toHaveTextContent('North America');
  });

  it('shows allowed geos from the policy when endpoints are empty', () => {
    renderBadge({ endpoints: [] });
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));

    expect(
      within(screen.getByTestId('geoZoneCheckbox-eu')).getByTestId('restrictedRegionsIncludedIcon')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('geoZoneCheckbox-us')).not.toBeInTheDocument();
  });

  it('shows policy geos that are missing from endpoint metadata', () => {
    renderBadge({
      policy: { region_policy: { allowed_geos: ['apac'] }, created_at: '2026-01-01T00:00:00Z' },
    });
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));

    expect(
      within(screen.getByTestId('geoZoneCheckbox-apac')).getByTestId(
        'restrictedRegionsIncludedIcon'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneCheckbox-apac')).toHaveTextContent('Asia Pacific');
    expect(
      within(screen.getByTestId('geoZoneCheckbox-eu')).getByTestId('restrictedRegionsExcludedIcon')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('geoZoneCheckbox-us')).getByTestId('restrictedRegionsExcludedIcon')
    ).toBeInTheDocument();
  });

  it('opens a regions policy popover with selected and unselected regions', () => {
    renderBadge({ policy: regionsPolicy });
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));

    expect(screen.getByTestId('restrictedRegionsRegionList')).toBeInTheDocument();
    expect(screen.getByTestId('manageRegionsZone-us')).toHaveTextContent('North America');
    expect(
      within(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).getByTestId(
        'restrictedRegionsIncludedIcon'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).toHaveTextContent(
      'us-east-1 - AWS'
    );
    expect(
      within(screen.getByTestId('manageRegionsCheckbox-gcp::europe-west1')).getByTestId(
        'restrictedRegionsExcludedIcon'
      )
    ).toBeInTheDocument();
  });

  it('shows policy regions that are missing from endpoint metadata', () => {
    renderBadge({
      policy: {
        region_policy: {
          allowed_regions: [{ csp: 'aws', region: 'ap-southeast-1', geo: 'apac' }],
        },
        created_at: '2026-01-01T00:00:00Z',
      },
    });
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));

    expect(
      within(screen.getByTestId('manageRegionsCheckbox-aws::ap-southeast-1')).getByTestId(
        'restrictedRegionsIncludedIcon'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('manageRegionsCheckbox-aws::ap-southeast-1')).toHaveTextContent(
      'ap-southeast-1 - AWS'
    );
    expect(
      within(screen.getByTestId('manageRegionsCheckbox-aws::us-east-1')).getByTestId(
        'restrictedRegionsExcludedIcon'
      )
    ).toBeInTheDocument();
  });

  it('hides the edit action when onManageRegions is omitted', () => {
    renderBadge();
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));
    expect(screen.queryByTestId('restrictedRegionsEditButton')).not.toBeInTheDocument();
  });

  it('shows the edit action when onManageRegions is provided', () => {
    renderBadge({ onManageRegions });
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));
    expect(screen.getByTestId('restrictedRegionsEditButton')).toHaveTextContent(
      'Edit region preferences'
    );
  });

  it('calls onManageRegions when the edit action is clicked', () => {
    renderBadge({ onManageRegions });
    fireEvent.click(screen.getByTestId('restrictedRegionsBadge'));
    fireEvent.click(screen.getByTestId('restrictedRegionsEditButton'));
    expect(onManageRegions).toHaveBeenCalledTimes(1);
  });
});
