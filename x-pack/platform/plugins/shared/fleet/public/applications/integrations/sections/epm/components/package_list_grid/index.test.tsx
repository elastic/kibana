/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import 'jest-styled-components';

import { createFleetTestRendererMock } from '../../../../../../mock';

import type { IntegrationCardItem } from '../../screens/home';

import { PackageListGrid } from '.';

function renderPackageListGrid({
  list = [],
  searchTerm = '',
}: { list?: IntegrationCardItem[]; searchTerm?: string } = {}) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <PackageListGrid
      list={list}
      categories={[]}
      searchTerm={searchTerm}
      setSearchTerm={() => {}}
      selectedCategory=""
      setCategory={() => {}}
      setUrlandReplaceHistory={() => {}}
      setUrlandPushHistory={() => {}}
      showControls={true}
      showSearchTools={false}
    />
  );

  return { utils };
}

describe('PackageListGrid', () => {
  it('only applies sticky styling to the controls sidebar on medium+ screens', () => {
    const { utils } = renderPackageListGrid();

    const sidebar = utils.getByTestId('epmList.controlsSideColumn');

    // Sticky only kicks in at the medium breakpoint so the filters scroll
    // normally (off the page) on mobile.
    expect(sidebar).toHaveStyleRule('position', 'sticky', {
      media: '(min-width: 768px)',
    });
    expect(sidebar).not.toHaveStyleRule('position', 'sticky');
  });

  describe('search member match', () => {
    const awsTile = {
      id: 'epr:aws',
      name: 'aws-onboarding',
      title: 'Amazon Web Services',
      description: 'Generic AWS description',
      categories: ['aws'],
      icons: [],
      url: '',
      version: '',
      integration: 'aws',
      searchableContent: 'guardduty Amazon GuardDuty',
      searchMembers: [{ name: 'guardduty', title: 'Amazon GuardDuty' }],
    } as IntegrationCardItem;
    const nginx = {
      id: 'epr:nginx',
      name: 'nginx',
      title: 'Nginx',
      description: 'Generic nginx description',
      categories: ['web'],
      icons: [],
      url: '',
      version: '',
      integration: '',
    } as IntegrationCardItem;

    it('tells the user which bundled service the search matched', () => {
      const { utils } = renderPackageListGrid({ list: [awsTile, nginx], searchTerm: 'guardduty' });

      expect(utils.getByText('Amazon GuardDuty').tagName).toBe('STRONG');
      expect(utils.getByText(/is part of the/)).toBeInTheDocument();
      expect(utils.queryByText('Generic AWS description')).not.toBeInTheDocument();
      expect(utils.queryByText('Generic nginx description')).not.toBeInTheDocument();
    });

    it('keeps the normal description for cards that matched on their own', () => {
      const { utils } = renderPackageListGrid({ list: [awsTile, nginx], searchTerm: 'nginx' });

      expect(utils.getByText('Generic nginx description')).toBeInTheDocument();
      expect(utils.queryByText(/is part of the/)).not.toBeInTheDocument();
    });
  });
});
