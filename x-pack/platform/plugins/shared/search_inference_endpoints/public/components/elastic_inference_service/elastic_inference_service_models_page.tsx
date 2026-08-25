/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { EisCloudConnectPromoCallout, useCloudConnectStatus } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../../common/constants';
import { useEisModels } from '../../hooks/use_eis_models';
import { useEndpointActions } from '../../hooks/use_endpoint_actions';
import { useInferenceCapabilities } from '../../hooks/use_inference_capabilities';
import { useKibana } from '../../hooks/use_kibana';
import { groupEndpointsByModel } from '../../utils/eis_utils';
import { ModelDetailFlyout } from '../model_detail_flyout/model_detail_flyout';
import { DeleteAction } from '../all_inference_endpoints/render_table_columns/render_actions/actions/delete/delete_action';
import { EisModelsListingProvider } from './eis_models_listing_provider';

export const ElasticInferenceServiceModelsPage = () => {
  const {
    services: { application, cloud, cloudConnect },
  } = useKibana();
  const { isLoading: isCloudConnectStatusLoading, isCloudConnected } = useCloudConnectStatus(
    cloudConnect?.hooks.useCloudConnectStatus
  );
  const queryClient = useQueryClient();
  const { data: endpoints, isLoading, isError } = useEisModels();
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

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        title={
          <h2>
            {i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.error.title', {
              defaultMessage: 'Unable to load models',
            })}
          </h2>
        }
        body={i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.error.body', {
          defaultMessage: 'An error occurred while fetching model data.',
        })}
      />
    );
  }

  return (
    <>
      {!isCloudConnectStatusLoading && !isCloudConnected && (
        <EisCloudConnectPromoCallout
          promoId="elasticInferencePage"
          isSelfManaged={!cloud?.isCloudEnabled}
          navigateToApp={() =>
            application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
          }
          addSpacer="top"
        />
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
        />
      )}
    </>
  );
};
