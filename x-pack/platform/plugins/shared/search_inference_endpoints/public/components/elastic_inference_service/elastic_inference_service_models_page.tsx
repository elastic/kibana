/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { useQueryClient } from '@kbn/react-query';
import { EisCloudConnectPromoCallout } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../../common/constants';
import { useEisModels } from '../../hooks/use_eis_models';
import type { EisPageState } from '../../hooks/use_eis_page_state';
import { useEndpointActions } from '../../hooks/use_endpoint_actions';
import { useInferenceCapabilities } from '../../hooks/use_inference_capabilities';
import { useKibana } from '../../hooks/use_kibana';
import { groupEndpointsByModel } from '../../utils/eis_utils';
import { ModelDetailFlyout } from '../model_detail_flyout/model_detail_flyout';
import { DeleteAction } from '../all_inference_endpoints/render_table_columns/render_actions/actions/delete/delete_action';
import { EisModelsListingProvider } from './eis_models_listing_provider';
import { EisSelfManagedEmptyPrompt } from './eis_self_managed_empty_prompt';
import { EisServiceDisabledCallout } from './eis_service_disabled_callout';
import { EisUnavailablePrompt } from './eis_unavailable_prompt';

interface ElasticInferenceServiceModelsPageProps {
  pageState: EisPageState;
  isCloudConnectPromoVisible: boolean;
  onManageRegions?: () => void;
}

export const ElasticInferenceServiceModelsPage = ({
  pageState,
  isCloudConnectPromoVisible,
  onManageRegions,
}: ElasticInferenceServiceModelsPageProps) => {
  const {
    services: { application, cloud },
  } = useKibana();
  const queryClient = useQueryClient();
  const { data: endpoints, error, isFetching, refetch } = useEisModels();
  const { canManage } = useInferenceCapabilities();
  const {
    showDeleteAction,
    selectedInferenceEndpoint,
    copyContent,
    onCancelDeleteModal,
    displayDeleteActionItem,
  } = useEndpointActions();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  const onModelDetailFlyoutClose = useCallback(() => {
    setSelectedModelId(undefined);
  }, []);

  const models = useMemo(() => (endpoints ? groupEndpointsByModel(endpoints) : []), [endpoints]);

  const openCloudConnect = useCallback(() => {
    application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true });
  }, [application]);

  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (pageState === 'loading') {
    return <EuiLoadingSpinner size="l" data-test-subj="eisModelsLoadingSpinner" />;
  }

  if (pageState === 'unavailable') {
    return <EisUnavailablePrompt error={error} isRetrying={isFetching} onRetry={retry} />;
  }

  if (pageState === 'selfManagedEmpty') {
    return <EisSelfManagedEmptyPrompt onConnectCluster={openCloudConnect} />;
  }

  return (
    <>
      {isCloudConnectPromoVisible && (
        <EisCloudConnectPromoCallout
          promoId="elasticInferencePage"
          isSelfManaged={!cloud?.isCloudEnabled}
          navigateToApp={openCloudConnect}
          addSpacer="top"
        />
      )}
      {pageState === 'serviceDisabled' && (
        <>
          <EuiSpacer size="l" />
          <EisServiceDisabledCallout onOpenCloudConnect={openCloudConnect} />
        </>
      )}
      <EuiSpacer size="l" />
      <EisModelsListingProvider
        {...{ models, canManage }}
        onViewModelDetails={setSelectedModelId}
      />
      {showDeleteAction && selectedInferenceEndpoint && (
        <DeleteAction
          selectedEndpoint={selectedInferenceEndpoint}
          displayModal={showDeleteAction}
          onCancel={onCancelDeleteModal}
        />
      )}
      {selectedModelId && endpoints && (
        <ModelDetailFlyout
          modelId={selectedModelId}
          allEndpoints={endpoints}
          onClose={onModelDetailFlyoutClose}
          onSaveEndpoint={() => queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY])}
          onDeleteEndpoint={canManage ? displayDeleteActionItem : undefined}
          onCopyEndpointId={copyContent}
          canManage={canManage}
          onManageRegions={onManageRegions}
        />
      )}
    </>
  );
};
