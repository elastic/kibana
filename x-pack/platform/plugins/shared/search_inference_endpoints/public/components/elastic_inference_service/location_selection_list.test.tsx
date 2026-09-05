/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import {
  GEO_LOCATION_COPY,
  LocationSelectionList,
  REGIONS_LOCATION_COPY,
  toGeoSelectableOptions,
  toRegionSelectableOptions,
} from './location_selection_list';
import type { ZoneGroup } from '../../utils/eis_utils';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

const expectOptionChecked = (testSubj: string, checked: boolean) => {
  expect(screen.getByTestId(testSubj)).toHaveAttribute('aria-checked', checked ? 'true' : 'false');
};

const geoListProps = {
  isLoading: false,
  isError: false,
  total: 2,
  totalSelected: 2,
  allSelected: true,
  onSelectAll: jest.fn(),
  onToggle: jest.fn(),
  ...GEO_LOCATION_COPY,
};

const zoneGroups: ZoneGroup[] = [
  {
    geo: 'eu',
    displayName: 'Europe',
    regions: [{ csp: 'gcp', region: 'europe-west1', geo: 'eu' }],
  },
  {
    geo: 'us',
    displayName: 'North America',
    regions: [{ csp: 'aws', region: 'us-east-1', geo: 'us' }],
  },
];

describe('toGeoSelectableOptions', () => {
  it('maps geo codes to checked options with display names', () => {
    expect(toGeoSelectableOptions(['eu', 'us'], new Set(['eu']))).toEqual([
      {
        key: 'eu',
        label: 'Europe',
        checked: 'on',
        'data-test-subj': 'geoZoneCheckbox-eu',
      },
      {
        key: 'us',
        label: 'North America',
        checked: undefined,
        'data-test-subj': 'geoZoneCheckbox-us',
      },
    ]);
  });
});

describe('toRegionSelectableOptions', () => {
  it('inserts a group label before the regions in each zone', () => {
    const options = toRegionSelectableOptions(zoneGroups, new Set(['aws::us-east-1']));

    expect(options).toEqual([
      {
        label: 'Europe',
        isGroupLabel: true,
        'data-test-subj': 'manageRegionsZone-eu',
      },
      {
        key: 'gcp::europe-west1',
        label: 'europe-west1 - GCP',
        checked: undefined,
        'data-test-subj': 'manageRegionsCheckbox-gcp::europe-west1',
      },
      {
        label: 'North America',
        isGroupLabel: true,
        'data-test-subj': 'manageRegionsZone-us',
      },
      {
        key: 'aws::us-east-1',
        label: 'us-east-1 - AWS',
        checked: 'on',
        'data-test-subj': 'manageRegionsCheckbox-aws::us-east-1',
      },
    ]);
  });
});

describe('LocationSelectionList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the selectable loading message', () => {
    render(
      <Wrapper>
        <LocationSelectionList
          {...geoListProps}
          isLoading
          options={[]}
          total={0}
          totalSelected={0}
          allSelected={false}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('manageGeosLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('manageRegionsSelectAllButton')).not.toBeInTheDocument();
  });

  it('renders the selectable empty message when there are no items', () => {
    render(
      <Wrapper>
        <LocationSelectionList
          {...geoListProps}
          options={[]}
          total={0}
          totalSelected={0}
          allSelected={false}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('manageRegionsNoGeos')).toBeInTheDocument();
    expect(screen.getByText('No geographies available')).toBeInTheDocument();
    expect(screen.queryByTestId('manageRegionsSelectAllButton')).not.toBeInTheDocument();
  });

  it('renders the selectable error message when loading fails', () => {
    render(
      <Wrapper>
        <LocationSelectionList
          {...geoListProps}
          isError
          options={[]}
          total={0}
          totalSelected={0}
          allSelected={false}
        />
      </Wrapper>
    );

    expect(screen.getByText('Failed to load geographic zones')).toBeInTheDocument();
    expect(screen.queryByTestId('manageRegionsNoGeos')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manageRegionsSelectAllButton')).not.toBeInTheDocument();
  });

  it('renders a geo option for each available geo', () => {
    render(
      <Wrapper>
        <LocationSelectionList
          {...geoListProps}
          total={3}
          options={toGeoSelectableOptions(['eu', 'us', 'apac'], new Set(['eu', 'us', 'apac']))}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('geoZoneCheckbox-eu')).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneCheckbox-us')).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneCheckbox-apac')).toBeInTheDocument();
  });

  it('marks selected geos and toggles the clicked geo code', () => {
    const onToggle = jest.fn();
    render(
      <Wrapper>
        <LocationSelectionList
          {...geoListProps}
          options={toGeoSelectableOptions(['eu', 'us'], new Set(['eu']))}
          totalSelected={1}
          allSelected={false}
          onToggle={onToggle}
        />
      </Wrapper>
    );

    expectOptionChecked('geoZoneCheckbox-eu', true);
    expectOptionChecked('geoZoneCheckbox-us', false);

    fireEvent.click(screen.getByTestId('geoZoneCheckbox-eu'));
    expect(onToggle).toHaveBeenCalledWith('eu');
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders region group labels and selectable region options', () => {
    const onToggle = jest.fn();
    render(
      <Wrapper>
        <LocationSelectionList
          {...REGIONS_LOCATION_COPY}
          isLoading={false}
          isError={false}
          options={toRegionSelectableOptions(zoneGroups, new Set(['aws::us-east-1']))}
          total={2}
          totalSelected={1}
          allSelected={false}
          onSelectAll={jest.fn()}
          onToggle={onToggle}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('manageRegionsZone-eu')).toHaveTextContent('Europe');
    expect(screen.getByTestId('manageRegionsZone-us')).toHaveTextContent('North America');
    expectOptionChecked('manageRegionsCheckbox-aws::us-east-1', true);
    expectOptionChecked('manageRegionsCheckbox-gcp::europe-west1', false);

    fireEvent.click(screen.getByTestId('manageRegionsCheckbox-gcp::europe-west1'));
    expect(onToggle).toHaveBeenCalledWith('gcp::europe-west1');
  });
});
