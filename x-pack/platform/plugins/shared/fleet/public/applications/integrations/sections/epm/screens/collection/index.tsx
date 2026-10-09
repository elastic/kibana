/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGrid,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useBreadcrumbs, useLink, useAuthz, useGetSettingsQuery } from '../../../../hooks';
import { WithoutHeaderLayout } from '../../../../layouts';
import { PackageCard } from '../../components/package_card';
import { INTEGRATION_GROUPS } from '../home/integration_groups';
import { useAvailablePackages } from '../home/hooks/use_available_packages';

export const CollectionDetailPage: React.FC = () => {
  useBreadcrumbs('integrations_all');

  const { getHref } = useLink();
  const { groupId } = useParams<{ groupId: string }>();
  const groupConfig = INTEGRATION_GROUPS[groupId];

  const authz = useAuthz();
  const { search } = useLocation();
  const prereleaseQueryParam = useMemo(
    () => new URLSearchParams(search).get('prerelease') === 'true',
    [search]
  );
  const { data: settings } = useGetSettingsQuery({ enabled: authz.fleet.readSettings });
  const prereleaseIntegrationsEnabled =
    prereleaseQueryParam || (settings?.item.prerelease_integrations_enabled ?? false);

  // Shares the same React Query cache as the browse page when prereleaseIntegrationsEnabled matches.
  const { allCards, isLoading } = useAvailablePackages({ prereleaseIntegrationsEnabled });

  const memberCards = useMemo(() => {
    const collectionCard = allCards.find((c) => c.isCollectionCard && c.name === groupId);
    return collectionCard?.groupMembers ?? [];
  }, [allCards, groupId]);

  if (!groupConfig) {
    return (
      <WithoutHeaderLayout>
        <EuiEmptyPrompt
          iconType="warning"
          title={
            <h2>
              <FormattedMessage
                id="xpack.fleet.collectionDetail.notFound.title"
                defaultMessage="Collection not found"
              />
            </h2>
          }
          body={
            <FormattedMessage
              id="xpack.fleet.collectionDetail.notFound.body"
              defaultMessage='The integration collection "{groupId}" does not exist.'
              values={{ groupId }}
            />
          }
        />
      </WithoutHeaderLayout>
    );
  }

  return (
    <WithoutHeaderLayout>
      <div>
        <EuiButtonEmpty
          iconType="chevronSingleLeft"
          size="xs"
          flush="left"
          href={getHref('integrations_all')}
        >
          <FormattedMessage
            id="xpack.fleet.collectionDetail.backToIntegrations"
            defaultMessage="Back to integrations"
          />
        </EuiButtonEmpty>
      </div>
      <EuiSpacer size="s" />
      <EuiPageHeader
        pageTitle={groupConfig.title}
        description={
          <EuiText size="s" color="subdued">
            {groupConfig.description}
          </EuiText>
        }
      />
      <EuiSpacer size="l" />
      {isLoading ? (
        <EuiLoadingSpinner size="xl" />
      ) : memberCards.length === 0 ? (
        <EuiEmptyPrompt
          iconType="package"
          title={
            <h2>
              <FormattedMessage
                id="xpack.fleet.collectionDetail.noMembers.title"
                defaultMessage="No integrations available"
              />
            </h2>
          }
          body={
            <FormattedMessage
              id="xpack.fleet.collectionDetail.noMembers.body"
              defaultMessage="No member integrations are available for this collection yet."
            />
          }
        />
      ) : (
        <EuiFlexGrid columns={3} gutterSize="m">
          {memberCards.map((card) => (
            <EuiFlexItem key={card.id}>
              <PackageCard {...card} showInstallationStatus />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      )}
    </WithoutHeaderLayout>
  );
};
