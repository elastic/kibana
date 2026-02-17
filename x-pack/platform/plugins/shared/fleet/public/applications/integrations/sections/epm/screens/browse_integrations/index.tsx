/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';

import { useBreadcrumbs, useLink, useStartServices } from '../../../../hooks';
import { NoEprCallout } from '../../components/no_epr_callout';
import { categoryExists } from '../home';

import { ResponsivePackageGrid } from './components/responsive_package_grid';
import { SearchAndFiltersBar } from './components/search_and_filters_bar';
import { Sidebar } from './components/side_bar';
import { useBrowseIntegrationHook } from './hooks';
import { NoDataPrompt } from './components/no_data_prompt';

const CreateNewIntegrationButton: React.FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { getHref, getAbsolutePath } = useLink();
  const history = useHistory();

  const createHref = getHref('integration_create');
  const uploadHref = getAbsolutePath('/app/integrations/upload');

  const onCreateClick = useCallback(() => {
    history.push('/create');
  }, [history]);

  const onUploadClick = useCallback(() => {
    setIsPopoverOpen(false);
    history.push('/upload');
  }, [history]);

  return (
    <EuiFlexGroup gutterSize="none" responsive={false} alignItems="stretch">
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          size="s"
          iconType="plusInCircle"
          href={createHref}
          onClick={(ev: React.MouseEvent<HTMLAnchorElement>) => {
            ev.preventDefault();
            onCreateClick();
          }}
          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          data-test-subj="createNewIntegrationBtn"
        >
          {i18n.translate('xpack.fleet.epmList.createNewIntegrationButton', {
            defaultMessage: 'Create new integration',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ display: 'flex' }}>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          panelPaddingSize="none"
          anchorPosition="downRight"
          style={{ display: 'flex', height: '100%' }}
          button={
            <EuiButtonIcon
              display="fill"
              color="primary"
              iconType="arrowDown"
              aria-label={i18n.translate(
                'xpack.fleet.epmList.createNewIntegrationDropdownAriaLabel',
                { defaultMessage: 'More integration creation options' }
              )}
              onClick={() => setIsPopoverOpen((prev) => !prev)}
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderLeft: '1px solid rgba(255,255,255,0.3)',
                height: '100%',
                minHeight: 0,
              }}
              data-test-subj="createNewIntegrationDropdownBtn"
            />
          }
        >
          <EuiContextMenuPanel
            items={[
              <EuiContextMenuItem
                key="upload"
                icon="exportAction"
                href={uploadHref}
                onClick={(ev) => {
                  ev.preventDefault();
                  onUploadClick();
                }}
                data-test-subj="uploadIntegrationPackageBtn"
              >
                {i18n.translate('xpack.fleet.epmList.uploadIntegrationPackageButton', {
                  defaultMessage: 'Upload integration package',
                })}
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const BrowseIntegrationsPage: React.FC<{ prereleaseIntegrationsEnabled: boolean }> = ({
  prereleaseIntegrationsEnabled,
}) => {
  useBreadcrumbs('integrations_all');

  const { automaticImportVTwo } = useStartServices();
  const { pathname, search } = useLocation();
  const history = useHistory();
  const euiTheme = useEuiTheme();

  const useGetAllIntegrationsHook =
    automaticImportVTwo?.hooks.useGetAllIntegrations ?? useEmptyAllIntegrations;
  const { integrations, isLoading: isLoadingCreatedIntegrations, isError: isCreatedIntegrationsError } =
    useGetAllIntegrationsHook();
  const hasCreatedIntegrations = integrations.length > 0;
  const isManageIntegrationsView = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get('view') === 'manage';
  }, [search]);

  const manageIntegrationsHref = useMemo(
    () => {
      const params = new URLSearchParams(search);
      params.set('view', 'manage');
      return `${pathname}?${params.toString()}`;
    },
    [pathname, search]
  );
  const onManageIntegrationsClick = useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      ev.preventDefault();
      history.push(manageIntegrationsHref);
    },
    [history, manageIntegrationsHref]
  );

  const {
    allCategories,
    initialSelectedCategory,
    selectedCategory,
    mainCategories,
    onlyAgentlessFilter,
    isLoading,
    isLoadingCategories,
    isLoadingAllPackages,
    isLoadingAppendCustomIntegrations,
    eprPackageLoadingError,
    eprCategoryLoadingError,
    setUrlandReplaceHistory,
    filteredCards,
    onCategoryChange,
  } = useBrowseIntegrationHook({ prereleaseIntegrationsEnabled });

  if (!isLoading && !categoryExists(initialSelectedCategory, allCategories)) {
    setUrlandReplaceHistory({
      searchString: '',
      categoryId: '',
      subCategoryId: '',
      onlyAgentless: onlyAgentlessFilter,
    });
    return null;
  }

  let noEprCallout;
  if (eprPackageLoadingError || eprCategoryLoadingError) {
    const error = eprPackageLoadingError || eprCategoryLoadingError;
    noEprCallout = (
      <EuiFlexItem grow={1}>
        <NoEprCallout statusCode={error?.statusCode} />
        <EuiSpacer size="s" />
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      alignItems="flexStart"
      gutterSize="none"
      data-test-subj="epmList.integrationCards"
    >
      <Sidebar
        isLoading={isLoading}
        categories={mainCategories}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
        CreateIntegrationCardButton={
          automaticImportVTwo?.components.CreateIntegrationSideCardButton
        }
        hasCreatedIntegrations={hasCreatedIntegrations}
        manageIntegrationsHref={manageIntegrationsHref}
        onManageIntegrationsClick={onManageIntegrationsClick}
      />
      <EuiFlexItem grow={5}>
        <EuiFlexGroup direction="column" gutterSize="none">
          <SearchAndFiltersBar
            actions={isManageIntegrationsView ? <CreateNewIntegrationButton /> : undefined}
          />
          {noEprCallout ? noEprCallout : null}
          <EuiFlexItem
            grow={1}
            data-test-subj="epmList.mainColumn"
            style={{
              position: 'relative',
              backgroundColor: euiTheme.euiTheme.colors.backgroundBasePlain,
            }}
          >
            {isManageIntegrationsView ? (
              <ManageIntegrationsTable
                integrations={integrations}
                isLoading={isLoadingCreatedIntegrations}
                isError={isCreatedIntegrationsError}
              />
            ) : filteredCards.length === 0 && !isLoading ? (
              <NoDataPrompt />
            ) : (
              <ResponsivePackageGrid
                items={filteredCards}
                isLoading={
                  isLoadingCategories || isLoadingAllPackages || isLoadingAppendCustomIntegrations
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

function useEmptyAllIntegrations() {
  return {
    integrations: [] as CreatedIntegrationRow[],
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
}

interface CreatedIntegrationRow {
  integrationId: string;
  title: string;
  totalDataStreamCount: number;
  successfulDataStreamCount: number;
  status: string;
}

function getStatusColor(status: string): 'default' | 'success' | 'danger' | 'warning' | 'hollow' {
  switch (status) {
    case 'approved':
    case 'completed':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'danger';
    case 'processing':
      return 'warning';
    case 'pending':
    default:
      return 'default';
  }
}

const ManageIntegrationsTable: React.FC<{
  integrations: CreatedIntegrationRow[];
  isLoading: boolean;
  isError: boolean;
}> = ({ integrations, isLoading, isError }) => {
  const { application } = useStartServices();
  const columns = useMemo<Array<EuiBasicTableColumn<CreatedIntegrationRow>>>(
    () => [
      {
        field: 'title',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.integrationName"
            defaultMessage="Integration name"
          />
        ),
        render: (title: string, item: CreatedIntegrationRow) => {
          return (
            <EuiLink
              onClick={() => {
                application.navigateToApp('automaticImportVTwo', {
                  path: `/integrations/${item.integrationId}`,
                });
              }}
            >
              {title}
            </EuiLink>
          );
        },
      },
      {
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.dataStreams"
            defaultMessage="Data streams"
          />
        ),
        render: (item: CreatedIntegrationRow) => (
          <EuiBadge color="hollow">
            {item.successfulDataStreamCount}/{item.totalDataStreamCount}
          </EuiBadge>
        ),
      },
      {
        field: 'status',
        name: (
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.table.status"
            defaultMessage="Status"
          />
        ),
        render: (status: string) => <EuiBadge color={getStatusColor(status)}>{status}</EuiBadge>,
      },
    ],
    []
  );

  if (isLoading) {
    return <EuiEmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />;
  }

  if (isError) {
    return (
      <EuiCallOut
        color="danger"
        iconType="error"
        title={
          <FormattedMessage
            id="xpack.fleet.epmList.manageIntegrations.errorTitle"
            defaultMessage="Unable to load integrations"
          />
        }
      />
    );
  }

  return (
    <>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.fleet.epmList.manageIntegrations.showingCount"
          defaultMessage="Showing {count} integrations"
          values={{ count: integrations.length }}
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={integrations}
        columns={columns}
        tableCaption="Manage created integrations"
        data-test-subj="manageIntegrationsTable"
      />
    </>
  );
};
