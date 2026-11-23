/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { pick } from 'lodash';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import { getConnectorIcon } from '../../utils/connector_display';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';
import { useConnectors } from '../../hooks/use_connectors';
import { useRegionAvailableEndpoints } from '../../hooks/use_region_available_endpoints';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import { useSupportedEffortLevels } from '../../hooks/use_supported_effort_levels';
import type { EndpointDeprecationInfo, EndpointEfforts } from '../../types';
import type { EndpointDisplay } from './types';
import { CopyToModal } from './copy_to_modal';
import { DisableRecommendedModelsModal } from './disable_recommended_models_modal';
import { EditableEndpointsList } from './editable_endpoints_list';
import { RecommendedEndpointsList } from './recommended_endpoints_list';
import { ResetDefaultsModal } from './reset_defaults_modal';
import { SubFeatureCardHeader } from './sub_feature_card_header';
import { useRecommendedDefaults } from './use_recommended_defaults';

const columnStyles = css`
  min-inline-size: min(20rem, 50%);
`;

interface SubFeatureCardProps {
  featureId: string;
  feature: InferenceFeatureConfig;
  endpointIds: string[];
  effectiveRecommendedEndpoints: string[];
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  efforts: EndpointEfforts;
  effectiveRecommendedEfforts: EndpointEfforts;
  onEffortsChange: (featureId: string, newEfforts: EndpointEfforts) => void;
  invalidEndpointIds: Set<string>;
  deprecatedEndpointsMap: Map<string, EndpointDeprecationInfo>;
  hasSavedObject: boolean;
  isFeatureDirty: boolean;
  globalDefaultId: string;
  canManage?: boolean;
  /** Bumped by the page each time unsaved changes are discarded; clears the sticky custom-mode flag. */
  discardVersion?: number;
}

export const SubFeatureCard: React.FC<SubFeatureCardProps> = ({
  featureId,
  feature,
  endpointIds,
  effectiveRecommendedEndpoints,
  onEndpointsChange,
  efforts,
  effectiveRecommendedEfforts,
  onEffortsChange,
  invalidEndpointIds,
  deprecatedEndpointsMap,
  hasSavedObject,
  isFeatureDirty,
  globalDefaultId,
  canManage = true,
  discardVersion = 0,
}) => {
  const { data: connectors = [] } = useConnectors(feature.taskType);
  const { features: registeredFeatures } = useRegisteredFeatures();
  const supportedEffortLevels = useSupportedEffortLevels();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [listWidth, setListWidth] = useState<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const { regionDeniedEndpointIds, availableEndpointIds } =
    useRegionAvailableEndpoints(endpointIds);
  const {
    hasAvailableRecommendedEndpoints,
    isUsingRecommendedDefaults,
    isDisableModalOpen,
    isResetModalOpen,
    toggleRecommendedDefaults,
    confirmDisableRecommendedDefaults,
    confirmResetToDefaults,
    closeDisableModal,
    closeResetModal,
  } = useRecommendedDefaults({
    featureId,
    endpointIds,
    effectiveRecommendedEndpoints,
    efforts,
    effectiveRecommendedEfforts,
    regionDeniedEndpointIds,
    onEndpointsChange,
    onEffortsChange,
    discardVersion,
  });

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setListWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isUsingRecommendedDefaults]);

  const endpointDisplayMap = useMemo(
    () =>
      new Map<string, EndpointDisplay>(
        connectors.map((connector) => [
          connector.connectorId,
          {
            icon: getConnectorIcon(connector),
            label: connector.name,
          },
        ])
      ),
    [connectors]
  );

  const hasOtherSubFeatures = registeredFeatures.some(
    (f) => f.featureId !== featureId && f.parentFeatureId !== undefined
  );

  const isGlobalDefaultAvailable =
    globalDefaultId !== NO_DEFAULT_MODEL && !regionDeniedEndpointIds.has(globalDefaultId);
  const showGlobalDefaultRow = !hasSavedObject && isGlobalDefaultAvailable;
  const { icon: globalDefaultIcon = 'processor', label: globalDefaultLabel = globalDefaultId } =
    endpointDisplayMap.get(globalDefaultId) ?? {};
  const globalDefaultRow =
    showGlobalDefaultRow && globalDefaultId
      ? {
          icon: globalDefaultIcon,
          label: globalDefaultLabel,
          showBadge: !isFeatureDirty,
          globalDefaultId,
          deprecationInfo: deprecatedEndpointsMap.get(globalDefaultId),
        }
      : undefined;

  const expandList = useCallback(() => setIsExpanded(true), []);
  const openCopyModal = useCallback(() => setIsCopyModalOpen(true), []);

  const handleCopyApply = useCallback(
    (selectedFeatureIds: string[]) => {
      for (const targetId of selectedFeatureIds) {
        onEndpointsChange(targetId, [...availableEndpointIds]);
        onEffortsChange(targetId, pick(efforts, availableEndpointIds));
      }
    },
    [availableEndpointIds, efforts, onEndpointsChange, onEffortsChange]
  );

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`subFeatureCard-${featureId}`}
        gutterSize="l"
        alignItems="baseline"
        wrap
      >
        <EuiFlexItem css={columnStyles}>
          <SubFeatureCardHeader
            featureId={featureId}
            feature={feature}
            isFeatureDirty={isFeatureDirty}
            isUsingRecommendedDefaults={isUsingRecommendedDefaults}
            hasAvailableRecommendedEndpoints={hasAvailableRecommendedEndpoints}
            canManage={canManage}
            onToggleRecommendedDefaults={toggleRecommendedDefaults}
          />
        </EuiFlexItem>

        <EuiFlexItem css={columnStyles}>
          <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('xpack.searchInferenceEndpoints.settings.assignedModels', {
                  defaultMessage: 'Assigned models',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />

            {isUsingRecommendedDefaults ? (
              <RecommendedEndpointsList
                featureId={featureId}
                endpointIds={availableEndpointIds}
                efforts={efforts}
                endpointDisplayMap={endpointDisplayMap}
                invalidEndpointIds={invalidEndpointIds}
                deprecatedEndpointsMap={deprecatedEndpointsMap}
                globalDefaultRow={globalDefaultRow}
              />
            ) : (
              <EditableEndpointsList
                featureId={featureId}
                feature={feature}
                endpointIds={availableEndpointIds}
                efforts={efforts}
                endpointDisplayMap={endpointDisplayMap}
                supportedEffortLevels={supportedEffortLevels}
                invalidEndpointIds={invalidEndpointIds}
                deprecatedEndpointsMap={deprecatedEndpointsMap}
                showGlobalDefaultRow={showGlobalDefaultRow}
                globalDefaultRow={globalDefaultRow}
                canManage={canManage}
                hasOtherSubFeatures={hasOtherSubFeatures}
                isExpanded={isExpanded}
                listRef={listRef}
                listWidth={listWidth}
                onExpand={expandList}
                onCopyTo={openCopyModal}
                onEndpointsChange={onEndpointsChange}
                onEffortsChange={onEffortsChange}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isCopyModalOpen && (
        <CopyToModal
          sourceFeatureName={feature.featureName}
          currentFeatureId={featureId}
          taskType={feature.taskType}
          allowTemplateRequiredModels={feature.allowTemplateRequiredModels}
          onApply={handleCopyApply}
          onClose={() => setIsCopyModalOpen(false)}
        />
      )}
      {isDisableModalOpen && (
        <DisableRecommendedModelsModal
          onConfirm={confirmDisableRecommendedDefaults}
          onCancel={closeDisableModal}
        />
      )}
      {isResetModalOpen && (
        <ResetDefaultsModal onConfirm={confirmResetToDefaults} onCancel={closeResetModal} />
      )}
    </>
  );
};
