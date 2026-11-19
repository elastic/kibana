/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import 'jest-styled-components';

import { createFleetTestRendererMock } from '../../../../../../mock';

import type { IntegrationCardItem } from '../../screens/home';

import { PackageListGrid } from '.';

function renderPackageListGrid({
  list = [],
  searchTerm = '',
  ...gridProps
}: { list?: IntegrationCardItem[]; searchTerm?: string } & Partial<
  React.ComponentProps<typeof PackageListGrid>
> = {}) {
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
      {...gridProps}
    />
  );

  return { utils, renderer };
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

  describe('collection tiles', () => {
    const member = (name: string, title: string) =>
      ({
        id: `epr:${name}`,
        name,
        title,
        description: `${title} description`,
        categories: ['web'],
        icons: [],
        // card urls include the base path (the test renderer uses `/mock`)
        url: `/mock/app/integrations/detail/${name}-1.0.0/overview`,
        version: '1.0.0',
        integration: '',
      } as IntegrationCardItem);
    const collection = {
      id: 'collection:nginx',
      name: 'nginx',
      title: 'Nginx',
      description: 'Collect from Nginx',
      categories: ['web'],
      icons: [],
      url: '/app/integrations',
      version: '',
      integration: '',
      isCollectionCard: true,
      groupMembers: [member('nginx', 'Nginx logs'), member('nginx_otel', 'Nginx OTel')],
    } as IntegrationCardItem;

    it('opens the variant chooser with return params when the host opts in', () => {
      const onCollectionClick = jest.fn();
      const hostCardClick = jest.fn();
      const { utils } = renderPackageListGrid({
        list: [{ ...collection, onCardClick: hostCardClick }],
        collectionReturnLocation: { appId: 'securitySolutionUI', path: '/get_started' },
        onCollectionClick,
      });

      expect(utils.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
      fireEvent.click(utils.getByTestId('integration-card:collection:nginx'));

      expect(hostCardClick).not.toHaveBeenCalled();
      expect(onCollectionClick).toHaveBeenCalledWith(expect.objectContaining({ name: 'nginx' }));
      expect(utils.getByTestId('collectionFlyout')).toBeInTheDocument();
      const href = utils
        .getByTestId('collectionVariantRow-epr:nginx_otel')
        .querySelector('a')
        ?.getAttribute('href');
      expect(href).toContain('/detail/nginx_otel-1.0.0/overview?');
      expect(href).toContain('returnAppId=securitySolutionUI');
      expect(href).toContain('returnPath=%2Fget_started');
    });

    it('hands the host cancel and save targets to the variant it navigates to', () => {
      const onCollectionVariantClick = jest.fn();
      const { utils, renderer } = renderPackageListGrid({
        list: [collection],
        collectionReturnLocation: { appId: 'securitySolutionUI', path: '/get_started' },
        onCollectionVariantClick,
      });
      const { application } = renderer.startServices;
      application.getUrlForApp.mockReturnValue('/app/security/get_started');

      fireEvent.click(utils.getByTestId('integration-card:collection:nginx'));
      fireEvent.click(
        utils.getByTestId('collectionVariantRow-epr:nginx_otel').querySelector('a') as HTMLElement
      );

      expect(onCollectionVariantClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'nginx_otel' })
      );
      // The add-integration page reads its save target from route state, not from the query params.
      expect(application.navigateToApp).toHaveBeenCalledWith('integrations', {
        path: expect.stringContaining('/detail/nginx_otel-1.0.0/overview?'),
        state: {
          onCancelNavigateTo: ['securitySolutionUI', { path: '/get_started' }],
          onCancelUrl: '/app/security/get_started',
          onSaveNavigateTo: ['securitySolutionUI', { path: '/get_started' }],
        },
      });
      expect(utils.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
    });

    it('leaves the card click to the host when it does not opt in', () => {
      const hostCardClick = jest.fn();
      const { utils } = renderPackageListGrid({
        list: [{ ...collection, onCardClick: hostCardClick }],
      });

      fireEvent.click(utils.getByTestId('integration-card:collection:nginx'));

      expect(hostCardClick).toHaveBeenCalled();
      expect(utils.queryByTestId('collectionFlyout')).not.toBeInTheDocument();
    });
  });
});
