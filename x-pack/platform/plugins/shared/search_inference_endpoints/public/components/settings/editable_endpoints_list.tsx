/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { RefObject } from 'react';
import {
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit } from 'lodash';
import type {
  InferenceFeatureResponse as InferenceFeatureConfig,
  ReasoningEffortLevel,
} from '../../../common/types';
import type { EndpointDeprecationInfo, EndpointEfforts } from '../../types';
import type { EndpointDisplay } from './types';
import { AddModelPopover } from './add_model_popover';
import { EditableEndpointRow } from './editable_endpoint_row';
import type { GlobalDefaultLockedRowProps } from './global_default_locked_row';
import { GlobalDefaultLockedRow } from './global_default_locked_row';

const COLLAPSED_COUNT = 5;

interface EditableEndpointsListProps {
  featureId: string;
  feature: InferenceFeatureConfig;
  endpointIds: string[];
  efforts: EndpointEfforts;
  endpointDisplayMap: Map<string, EndpointDisplay>;
  supportedEffortLevels: Map<string, ReasoningEffortLevel[]>;
  invalidEndpointIds: Set<string>;
  deprecatedEndpointsMap: Map<string, EndpointDeprecationInfo>;
  showGlobalDefaultRow: boolean;
  globalDefaultRow?: Omit<GlobalDefaultLockedRowProps, 'featureId'>;
  canManage: boolean;
  hasOtherSubFeatures: boolean;
  isExpanded: boolean;
  listRef: RefObject<HTMLDivElement>;
  listWidth?: number;
  onExpand: () => void;
  onCopyTo: () => void;
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  onEffortsChange: (featureId: string, newEfforts: EndpointEfforts) => void;
}

export const EditableEndpointsList: React.FC<EditableEndpointsListProps> = ({
  featureId,
  feature,
  endpointIds,
  efforts,
  endpointDisplayMap,
  supportedEffortLevels,
  invalidEndpointIds,
  deprecatedEndpointsMap,
  showGlobalDefaultRow,
  globalDefaultRow,
  canManage,
  hasOtherSubFeatures,
  isExpanded,
  listRef,
  listWidth,
  onExpand,
  onCopyTo,
  onEndpointsChange,
  onEffortsChange,
}) => {
  const hasOverflow = endpointIds.length > COLLAPSED_COUNT;
  const visibleEndpoints = isExpanded ? endpointIds : endpointIds.slice(0, COLLAPSED_COUNT);
  const hiddenCount = endpointIds.length - COLLAPSED_COUNT;
  const canAddMore =
    !feature.maxNumberOfEndpoints || endpointIds.length < feature.maxNumberOfEndpoints;

  const showGlobalDefaultFallbackRow = showGlobalDefaultRow && endpointIds.length === 0;
  const hasAssignedRows = endpointIds.length > 0 || showGlobalDefaultFallbackRow;

  const isFullListVisible = !hasOverflow || isExpanded;
  const canEditFullList = canManage && isFullListVisible;
  const showAddModelPopover = canEditFullList && canAddMore;
  const showCopyToButton = canEditFullList && hasOtherSubFeatures;

  const handleRemove = useCallback(
    (index: number) => {
      onEndpointsChange(
        featureId,
        endpointIds.filter((_, i) => i !== index)
      );
    },
    [endpointIds, featureId, onEndpointsChange]
  );

  const handleAdd = useCallback(
    (endpointId: string) => {
      onEndpointsChange(featureId, [...endpointIds, endpointId]);
    },
    [endpointIds, featureId, onEndpointsChange]
  );

  const handleDragEnd = useCallback(
    ({
      source,
      destination,
    }: {
      source: { index: number };
      destination?: { index: number } | null;
    }) => {
      if (destination && source.index !== destination.index) {
        onEndpointsChange(
          featureId,
          euiDragDropReorder(endpointIds, source.index, destination.index)
        );
      }
    },
    [endpointIds, featureId, onEndpointsChange]
  );

  const handleEffortChange = useCallback(
    (endpointId: string, effort?: ReasoningEffortLevel) => {
      onEffortsChange(
        featureId,
        effort === undefined ? omit(efforts, endpointId) : { ...efforts, [endpointId]: effort }
      );
    },
    [efforts, featureId, onEffortsChange]
  );

  return (
    <>
      <EuiDragDropContext onDragEnd={handleDragEnd}>
        <div ref={listRef}>
          <EuiSplitPanel.Outer hasBorder={hasAssignedRows}>
            {showGlobalDefaultFallbackRow && globalDefaultRow && (
              <GlobalDefaultLockedRow featureId={featureId} {...globalDefaultRow} />
            )}
            <EuiDroppable droppableId={`assigned-models-${featureId}`} spacing="none">
              {visibleEndpoints.map((endpointId, index) => {
                const { icon = 'processor', label = endpointId } =
                  endpointDisplayMap.get(endpointId) ?? {};
                return (
                  <EditableEndpointRow
                    key={endpointId}
                    endpointId={endpointId}
                    index={index}
                    icon={icon}
                    label={label}
                    isInvalid={invalidEndpointIds.has(endpointId)}
                    deprecationInfo={deprecatedEndpointsMap.get(endpointId)}
                    supportedLevels={supportedEffortLevels.get(endpointId)}
                    effort={efforts[endpointId]}
                    canManage={canManage}
                    isRemoveDisabled={endpointIds.length <= 1}
                    showDivider={index !== visibleEndpoints.length - 1}
                    onRemove={handleRemove}
                    onEffortChange={handleEffortChange}
                  />
                );
              })}
            </EuiDroppable>
          </EuiSplitPanel.Outer>
          {!hasAssignedRows && (
            <EuiText size="s" color="subdued" data-test-subj={`no-models-available-${featureId}`}>
              <p>
                {i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.assignedModels.noModelsAvailable',
                  { defaultMessage: 'No models available' }
                )}
              </p>
            </EuiText>
          )}
        </div>
      </EuiDragDropContext>
      <EuiSpacer size="xs" />
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        {hasOverflow && !isExpanded && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="chevronSingleDown"
              size="s"
              onClick={onExpand}
              data-test-subj={`show-more-${featureId}`}
              color="text"
            >
              {i18n.translate('xpack.searchInferenceEndpoints.settings.showMore', {
                defaultMessage: 'Show {count} more',
                values: { count: hiddenCount },
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {showAddModelPopover && (
          <EuiFlexItem grow={false}>
            <AddModelPopover
              existingEndpointIds={endpointIds}
              onAdd={handleAdd}
              taskType={feature.taskType}
              panelWidth={listWidth}
              allowTemplateRequiredModels={feature.allowTemplateRequiredModels}
            />
          </EuiFlexItem>
        )}
        {showCopyToButton && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="copy"
              size="s"
              color="text"
              onClick={onCopyTo}
              isDisabled={endpointIds.length === 0}
              data-test-subj={`copy-to-${featureId}`}
            >
              {i18n.translate('xpack.searchInferenceEndpoints.settings.copyTo.button', {
                defaultMessage: 'Copy to',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
};
