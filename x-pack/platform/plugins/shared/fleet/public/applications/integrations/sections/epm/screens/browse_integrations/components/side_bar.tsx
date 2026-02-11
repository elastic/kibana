/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFacetButton,
  EuiFacetGroup,
  EuiFlexItem,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';
import React from 'react';

import { i18n } from '@kbn/i18n';
import styled from '@emotion/styled';

import { Loading } from '../../../../../../../components';

export interface CategoryFacet {
  count: number;
  id: string;
  title: string;
  parent_id?: string;
  parent_title?: string;
}

export const UPDATES_AVAILABLE = 'updates_available';
export const INSTALL_FAILED = 'install_failed';
export const UPDATE_FAILED = 'update_failed';

export type ExtendedIntegrationCategory = IntegrationCategory | typeof UPDATES_AVAILABLE | '';

export const ALL_CATEGORY = {
  id: '',
  title: i18n.translate('xpack.fleet.epmList.allPackagesFilterLinkText', {
    defaultMessage: 'All categories',
  }),
};

export const ALL_INSTALLED_CATEGORY = {
  id: '',
  title: i18n.translate('xpack.fleet.epmList.allPackagesInstalledFilterLinkText', {
    defaultMessage: 'All installed',
  }),
};

export const UPDATES_AVAILABLE_CATEGORY = {
  id: UPDATES_AVAILABLE,
  title: i18n.translate('xpack.fleet.epmList.updatesAvailableFilterLinkText', {
    defaultMessage: 'Updates available',
  }),
};

export const INSTALL_FAILED_CATEGORY = {
  id: INSTALL_FAILED,
  title: i18n.translate('xpack.fleet.epmList.installFailedFilterLinkText', {
    defaultMessage: 'Install failed',
  }),
};

export const UPDATE_FAILED_CATEGORY = {
  id: UPDATE_FAILED,
  title: i18n.translate('xpack.fleet.epmList.updateFailedFilterLinkText', {
    defaultMessage: 'Update failed',
  }),
};

export interface Props {
  isLoading?: boolean;
  categories: CategoryFacet[];
  selectedCategory: string;
  onCategoryChange: (category: CategoryFacet) => void;
}

const StickySidebar = styled(EuiFlexItem)`
  position: sticky;
  top: var(--kbn-application--sticky-headers-offset, var(--kbn-layout--header-height, '0px'));
  padding-top: ${(props) => props.theme.euiTheme.size.m};
  max-height: calc(100vh - var(--kbn-layout--header-height, '0px'));
  overflow: scroll;
  padding-right: ${(props) => props.theme.euiTheme.size.l};
`;

export const Sidebar: React.FC<Props> = ({
  isLoading,
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <StickySidebar>
      <EuiAccordion
        id="categoriesUserIntegrationsAccordion"
        buttonContent={i18n.translate('xpack.fleet.epmList.userIntegrationAccordionLabel', {
          defaultMessage: 'Your created integrations',
        })}
        buttonProps={{
          style: {
            fontWeight: euiTheme.font.weight.bold,
          },
        }}
        initialIsOpen={true}
        paddingSize="none"
      >
        <EuiSpacer size="s" />
        TODO
      </EuiAccordion>
      <EuiSpacer size="m" />
      <EuiAccordion
        id="categoriesDevelopedByElasticAccordion"
        buttonContent={i18n.translate('xpack.fleet.epmList.filterByCategoryAccordionLabel', {
          defaultMessage: 'Developed by Elastic',
        })}
        buttonProps={{
          style: {
            fontWeight: euiTheme.font.weight.bold,
          },
        }}
        initialIsOpen={true}
        paddingSize="none"
      >
        <EuiSpacer size="s" />
        <CategoryFacets
          isLoading={isLoading}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </EuiAccordion>
    </StickySidebar>
  );
};

export function CategoryFacets({
  isLoading,
  categories,
  selectedCategory,
  onCategoryChange,
}: Props) {
  const controls = (
    <EuiFacetGroup gutterSize="s">
      {isLoading ? (
        <>
          <EuiSpacer size="m" />
          <Loading size="l" />
          <EuiSpacer size="m" />
        </>
      ) : (
        categories.map((category) => {
          return (
            <EuiFacetButton
              data-test-subj={`epmList.categories.${category.id}`}
              isSelected={category.id === selectedCategory}
              key={category.id}
              id={category.id}
              style={{
                padding: 0,
              }}
              quantity={category.count}
              onClick={() => onCategoryChange(category)}
              aria-label={i18n.translate('xpack.fleet.epmList.facetButton.ariaLabel', {
                defaultMessage:
                  '{key}, {count} {count, plural, one { integration } other { integrations }}',
                values: {
                  key: category.title,
                  count: category.count,
                },
              })}
            >
              {category.title}
            </EuiFacetButton>
          );
        })
      )}
    </EuiFacetGroup>
  );

  return controls;
}
