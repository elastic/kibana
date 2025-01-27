/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule, EuiFlexItem, EuiCallOut, EuiLink } from '@elastic/eui';

import { useStartServices } from '../../../../hooks';

import { useBreadcrumbs } from '../../../../hooks';

import { PackageListGrid } from '../../components/package_list_grid';

import { IntegrationPreference } from '../../components/integration_preference';

import { CategoryFacets } from './category_facets';

import { categoryExists } from '.';

import { useAvailablePackages } from './hooks/use_available_packages';

import type { ExtendedIntegrationCategory } from './category_facets';

const NoEprCallout: FunctionComponent<{ statusCode?: number }> = ({
  statusCode,
}: {
  statusCode?: number;
}) => {
  let titleMessage;
  let descriptionMessage;
  if (statusCode === 502) {
    titleMessage = i18n.translate('xpack.fleet.epmList.eprUnavailableBadGatewayCalloutTitle', {
      defaultMessage:
        'Kibana cannot reach the Elastic Package Registry, which provides Elastic Agent integrations\n',
    });
    descriptionMessage = (
      <FormattedMessage
        id="xpack.fleet.epmList.eprUnavailableCallouBdGatewaytTitleMessage"
        defaultMessage="To view these integrations, configure a  {registryproxy} or host {onpremregistry}."
        values={{
          registryproxy: <ProxyLink />,
          onpremregistry: <OnPremLink />,
        }}
      />
    );
  } else {
    titleMessage = i18n.translate('xpack.fleet.epmList.eprUnavailable400500CalloutTitle', {
      defaultMessage:
        'Kibana cannot connect to the Elastic Package Registry, which provides Elastic Agent integrations\n',
    });
    descriptionMessage = (
      <FormattedMessage
        id="xpack.fleet.epmList.eprUnavailableCallout400500TitleMessage"
        defaultMessage="Ensure the {registryproxy} or {onpremregistry} is configured correctly, or try again later."
        values={{
          registryproxy: <ProxyLink />,
          onpremregistry: <OnPremLink />,
        }}
      />
    );
  }

  return (
    <EuiCallOut title={titleMessage} iconType="iInCircle" color={'warning'}>
      <p>{descriptionMessage}</p>
    </EuiCallOut>
  );
};

function ProxyLink() {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.settingsFleetServerProxySettings} target="_blank">
      {i18n.translate('xpack.fleet.epmList.proxyLinkSnippedText', {
        defaultMessage: 'proxy server',
      })}
    </EuiLink>
  );
}

function OnPremLink() {
  const { docLinks } = useStartServices();

  return (
    <EuiLink href={docLinks.links.fleet.onPremRegistry} target="_blank">
      {i18n.translate('xpack.fleet.epmList.onPremLinkSnippetText', {
        defaultMessage: 'your own registry',
      })}
    </EuiLink>
  );
}

export const AvailablePackages: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const {
    initialSelectedCategory,
    selectedCategory,
    setCategory,
    allCategories,
    mainCategories,
    preference,
    setPreference,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    searchTerm,
    setSearchTerm,
    setUrlandPushHistory,
    setUrlandReplaceHistory,
    filteredCards,
    availableSubCategories,
    selectedSubCategory,
    setSelectedSubCategory,
  } = useAvailablePackages({ prereleaseIntegrationsEnabled });

  const onCategoryChange = useCallback(
    ({ id }: { id: string }) => {
      setCategory(id as ExtendedIntegrationCategory);
      setSearchTerm('');
      setSelectedSubCategory(undefined);
      setUrlandPushHistory({ searchString: '', categoryId: id, subCategoryId: '' });
    },
    [setCategory, setSearchTerm, setSelectedSubCategory, setUrlandPushHistory]
  );

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlandReplaceHistory({ searchString: searchTerm, categoryId: '', subCategoryId: '' });
    return null;
  }

  let controls = [
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="m" />
      <IntegrationPreference
        initialType={preference}
        prereleaseIntegrationsEnabled={prereleaseIntegrationsEnabled}
        onChange={setPreference}
      />
    </EuiFlexItem>,
  ];

  if (mainCategories) {
    controls = [
      <EuiFlexItem className="eui-yScrollWithShadows">
        <CategoryFacets
          isLoading={isLoading}
          categories={mainCategories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </EuiFlexItem>,
      ...controls,
    ];
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = <NoEprCallout statusCode={error?.statusCode} />;
  }

  return (
    <PackageListGrid
      isLoading={isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations}
      controls={controls}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      list={filteredCards}
      selectedCategory={selectedCategory}
      setCategory={setCategory}
      categories={mainCategories}
      setUrlandReplaceHistory={setUrlandReplaceHistory}
      setUrlandPushHistory={setUrlandPushHistory}
      callout={noEprCallout}
      showCardLabels={false}
      availableSubCategories={availableSubCategories}
      selectedSubCategory={selectedSubCategory}
      setSelectedSubCategory={setSelectedSubCategory}
      showMissingIntegrationMessage
    />
  );
};
