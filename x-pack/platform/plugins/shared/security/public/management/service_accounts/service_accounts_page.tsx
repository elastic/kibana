/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';

import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { ServiceAccountsEmptyPrompt } from './service_accounts_empty_prompt';
import type { ServiceAccountTableItem } from './service_accounts_table';
import { ServiceAccountsTable } from './service_accounts_table';
import { SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE } from '../../../common/service_accounts/constants';
import type { ServiceAccountsAPIClient } from '../../service_accounts';

export interface ServiceAccountsPageProps {
  canCreate: boolean;
  serviceAccountsAPIClient: Pick<PublicMethodsOf<ServiceAccountsAPIClient>, 'list'>;
  onCreateAccount: () => void;
}

export const ServiceAccountsPage = ({
  canCreate,
  serviceAccountsAPIClient,
  onCreateAccount,
}: ServiceAccountsPageProps) => {
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccountTableItem[]>([]);
  const [nextPage, setNextPage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasLoadMoreError, setHasLoadMoreError] = useState(false);

  const loadServiceAccounts = useCallback(
    async (after?: string) => {
      const isLoadingNextPage = after !== undefined;
      if (isLoadingNextPage) {
        setIsLoadingMore(true);
        setHasLoadMoreError(false);
      } else {
        setIsLoading(true);
        setHasError(false);
      }

      try {
        const response = await serviceAccountsAPIClient.list({
          limit: SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE,
          ...(after !== undefined ? { after } : {}),
        });
        if (isLoadingNextPage && response.nextPage === after) {
          throw new Error('Service account pagination returned a repeated cursor.');
        }

        setServiceAccounts((currentServiceAccounts) =>
          isLoadingNextPage
            ? [...currentServiceAccounts, ...response.serviceAccounts]
            : response.serviceAccounts
        );
        setNextPage(response.nextPage);
      } catch {
        if (isLoadingNextPage) {
          setHasLoadMoreError(true);
        } else {
          setHasError(true);
        }
      } finally {
        if (isLoadingNextPage) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [serviceAccountsAPIClient]
  );

  useEffect(() => {
    loadServiceAccounts();
  }, [loadServiceAccounts]);

  const loadMoreServiceAccounts = useCallback(() => {
    if (nextPage !== undefined) {
      loadServiceAccounts(nextPage);
    }
  }, [loadServiceAccounts, nextPage]);

  const menu: AppHeaderMenu | undefined = canCreate
    ? {
        primaryActionItem: {
          id: 'createAccount',
          label: i18n.translate('xpack.security.management.serviceAccounts.createButton', {
            defaultMessage: 'Create account',
          }),
          iconType: 'plusCircle',
          testId: 'serviceAccountsPageCreateButton',
          run: onCreateAccount,
        },
      }
    : undefined;

  return (
    <>
      <AppHeader
        title={i18n.translate('xpack.security.management.serviceAccounts.pageTitle', {
          defaultMessage: 'Service accounts',
        })}
        description={i18n.translate('xpack.security.management.serviceAccounts.pageDescription', {
          defaultMessage: 'Create a dedicated identity to execute workloads.',
        })}
        menu={menu}
        spacing="bleed"
      />
      <KibanaPageTemplate.Section
        alignment={isLoading || hasError || serviceAccounts.length === 0 ? 'center' : 'top'}
        grow
      >
        {isLoading ? (
          <EuiLoadingSpinner
            size="l"
            aria-label={i18n.translate(
              'xpack.security.management.serviceAccounts.loadingAriaLabel',
              { defaultMessage: 'Loading service accounts' }
            )}
            data-test-subj="serviceAccountsLoading"
          />
        ) : hasError ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            title={
              <h2>
                {i18n.translate('xpack.security.management.serviceAccounts.loadErrorTitle', {
                  defaultMessage: 'Unable to load service accounts',
                })}
              </h2>
            }
            body={
              <p>
                {i18n.translate('xpack.security.management.serviceAccounts.loadErrorDescription', {
                  defaultMessage: 'Try again or contact your administrator.',
                })}
              </p>
            }
            actions={
              <EuiButton
                onClick={() => loadServiceAccounts()}
                data-test-subj="serviceAccountsRetry"
              >
                {i18n.translate('xpack.security.management.serviceAccounts.loadErrorRetryButton', {
                  defaultMessage: 'Try again',
                })}
              </EuiButton>
            }
            data-test-subj="serviceAccountsLoadError"
          />
        ) : serviceAccounts.length === 0 ? (
          <ServiceAccountsEmptyPrompt canCreate={canCreate} onCreateAccount={onCreateAccount} />
        ) : (
          <ServiceAccountsTable
            serviceAccounts={serviceAccounts}
            hasMore={nextPage !== undefined}
            isLoadingMore={isLoadingMore}
            hasLoadMoreError={hasLoadMoreError}
            onLoadMore={loadMoreServiceAccounts}
          />
        )}
      </KibanaPageTemplate.Section>
    </>
  );
};
