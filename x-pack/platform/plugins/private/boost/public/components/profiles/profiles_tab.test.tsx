/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  BUILTIN_PROFILES,
  DEFAULT_RULE_PROFILES,
  createDefaultRules,
} from '../../../common/presets';
import type { BoostProfile } from '../../../common/types';
import { ProfilesTab } from './profiles_tab';

const customProfile = (name: string): BoostProfile => ({
  name,
  type: 'indices',
  is_builtin: false,
  min_boost: 1,
  max_boost: 4,
  high_availability: 'none',
  prewarm: false,
  pinned: false,
});

describe('ProfilesTab', () => {
  it("links a profile's rule count to the rules that use it", () => {
    render(
      <MemoryRouter initialEntries={['/profiles']}>
        <IntlProvider locale="en">
          <ProfilesTab
            profiles={[...BUILTIN_PROFILES, customProfile('catalog-search')]}
            rules={[
              ...createDefaultRules(DEFAULT_RULE_PROFILES),
              {
                name: 'catalogs',
                index_patterns: ['catalog-*'],
                boost_profile: 'catalog-search',
                priority: 1,
                is_builtin: false,
              },
            ]}
            dataSources={[]}
            canEdit
          />
        </IntlProvider>
      </MemoryRouter>
    );

    expect(
      screen.getByRole('link', { name: 'View 1 rule using boost profile "catalog-search"' })
    ).toHaveAttribute('href', '/rules?profile=catalog-search');
    // The table always pages, however few profiles there are.
    expect(screen.getByTestId('boostProfilesTable')).toHaveTextContent('Rows per page: 10');
    // Unused profiles have nothing to link to.
    expect(
      screen.queryByRole('link', { name: /using boost profile "_on-demand"/ })
    ).not.toBeInTheDocument();
    // The count and the type filters say what's there: three built-in profiles of each type, and
    // the custom indices one.
    expect(screen.getByTestId('boostProfilesCount')).toHaveTextContent(
      'Showing 1–7 of 7 boost profiles'
    );
    expect(screen.getByTestId('boostTypeFilter-indices')).toHaveTextContent('4');
    expect(screen.getByTestId('boostTypeFilter-data_streams')).toHaveTextContent('3');
  });
});
