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
import { GeoZoneList } from './geo_zone_list';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

describe('GeoZoneList', () => {
  const onToggleGeo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a row for each available geo', () => {
    render(
      <Wrapper>
        <GeoZoneList
          availableGeos={['eu', 'us', 'apac']}
          checkedGeos={new Set(['eu', 'us', 'apac'])}
          onToggleGeo={onToggleGeo}
        />
      </Wrapper>
    );

    expect(screen.getByTestId('geoZoneRow-eu')).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneRow-us')).toBeInTheDocument();
    expect(screen.getByTestId('geoZoneRow-apac')).toBeInTheDocument();
  });

  it('renders nothing when availableGeos is empty', () => {
    const { container } = render(
      <Wrapper>
        <GeoZoneList availableGeos={[]} checkedGeos={new Set()} onToggleGeo={onToggleGeo} />
      </Wrapper>
    );

    expect(container.querySelectorAll('[data-test-subj^="geoZoneRow-"]')).toHaveLength(0);
  });

  it('shows the i18n display name for known geos', () => {
    render(
      <Wrapper>
        <GeoZoneList
          availableGeos={['eu', 'us']}
          checkedGeos={new Set(['eu', 'us'])}
          onToggleGeo={onToggleGeo}
        />
      </Wrapper>
    );

    expect(screen.getByText('Europe')).toBeInTheDocument();
    expect(screen.getByText('North America')).toBeInTheDocument();
  });

  it('falls back to the raw code for unknown geos', () => {
    render(
      <Wrapper>
        <GeoZoneList
          availableGeos={['mea']}
          checkedGeos={new Set(['mea'])}
          onToggleGeo={onToggleGeo}
        />
      </Wrapper>
    );

    expect(screen.getByText('mea')).toBeInTheDocument();
  });

  it('renders a checked checkbox for geos in checkedGeos', () => {
    render(
      <Wrapper>
        <GeoZoneList
          availableGeos={['eu', 'us']}
          checkedGeos={new Set(['eu'])}
          onToggleGeo={onToggleGeo}
        />
      </Wrapper>
    );

    const euCheckbox = screen.getByTestId('geoZoneCheckbox-eu');
    expect(euCheckbox).toBeChecked();

    const usCheckbox = screen.getByTestId('geoZoneCheckbox-us');
    expect(usCheckbox).not.toBeChecked();
  });

  it('calls onToggleGeo with the geo code when a checkbox is clicked', () => {
    render(
      <Wrapper>
        <GeoZoneList
          availableGeos={['eu', 'us']}
          checkedGeos={new Set(['eu', 'us'])}
          onToggleGeo={onToggleGeo}
        />
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('geoZoneCheckbox-eu'));
    expect(onToggleGeo).toHaveBeenCalledWith('eu');
    expect(onToggleGeo).toHaveBeenCalledTimes(1);
  });

  it('shows "All available regions" annotation for each row', () => {
    render(
      <Wrapper>
        <GeoZoneList
          availableGeos={['eu']}
          checkedGeos={new Set(['eu'])}
          onToggleGeo={onToggleGeo}
        />
      </Wrapper>
    );

    expect(screen.getByText('All available regions')).toBeInTheDocument();
  });
});
