/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { css } from '@emotion/react';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import { getProviderKeyForCreator } from '../../utils/eis_utils';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';
import { AddModelPopover } from './add_model_popover';
import { CopyToModal } from './copy_to_modal';
import { DisableRecommendedModelsModal } from './disable_recommended_models_modal';
import { ResetToDefaultsModal } from './reset_to_defaults_modal';
import { useConnectors } from '../../hooks/use_connectors';

const COLLAPSED_COUNT = 5;

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const getConnectorIcon = (connector: InferenceConnector): string => {
  let key: string | undefined;
  switch (connector.type) {
    case InferenceConnectorType.OpenAI:
      key = connector.config?.apiProvider === 'Azure OpenAI' ? 'azureopenai' : 'openai';
      break;
    case InferenceConnectorType.Bedrock:
      key = 'amazonbedrock';
      break;
    case InferenceConnectorType.Gemini:
      key = 'googlevertexai';
      break;
    case InferenceConnectorType.Inference:
      key =
        getProviderKeyForCreator(connector.config?.modelCreator) ??
        connector.config?.service ??
        connector.config?.provider;
      break;
  }
  return SERVICE_PROVIDERS[key as ServiceProviderKeys]?.icon ?? 'compute';
};

interface SubFeatureCardProps {
  featureId: string;
  feature: InferenceFeatureConfig;
  endpointIds: string[];
  effectiveRecommendedEndpoints: string[];
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  invalidEndpointIds: Set<string>;
}

export const SubFeatureCard: React.FC<SubFeatureCardProps> = ({
  featureId,
  feature,
  endpointIds,
  effectiveRecommendedEndpoints,
  onEndpointsChange,
  invalidEndpointIds,
}) => {
  const { data: connectors = [] } = useConnectors();
  const { features: registeredFeatures } = useRegisteredFeatures();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [listWidth, setListWidth] = useState<number | undefined>(undefined);
  // The user has explicitly opted into custom mode this session. We need this on top of the
  // array-equality check because the editable list is seeded with the recommended endpoints,
  // so without this flag the toggle would snap back to ON immediately after the user confirms
  // "Turn off recommended defaults".
  const [hasOptedIntoCustomMode, setHasOptedIntoCustomMode] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { isTechPreview, isBeta } = feature;

  const useRecommendedDefaults = useMemo(
    () => !hasOptedIntoCustomMode && arraysEqual(endpointIds, effectiveRecommendedEndpoints),
    [hasOptedIntoCustomMode, endpointIds, effectiveRecommendedEndpoints]
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setListWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const endpointDisplayMap = useMemo(
    () =>
      new Map(
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

  const hasOverflow = endpointIds.length > COLLAPSED_COUNT;
  const visibleEndpoints = isExpanded ? endpointIds : endpointIds.slice(0, COLLAPSED_COUNT);
  const hiddenCount = endpointIds.length - COLLAPSED_COUNT;
  const canAddMore =
    !feature.maxNumberOfEndpoints || endpointIds.length < feature.maxNumberOfEndpoints;

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

  const handleCopyApply = useCallback(
    (selectedFeatureIds: string[]) => {
      for (const targetId of selectedFeatureIds) {
        onEndpointsChange(targetId, [...endpointIds]);
      }
    },
    [endpointIds, onEndpointsChange]
  );

  const handleToggleRecommendedDefaults = useCallback(
    (checked: boolean) => {
      if (checked) {
        // Going OFF -> ON: confirm before discarding the user's customizations.
        if (!useRecommendedDefaults) {
          setIsResetModalOpen(true);
          return;
        }
        // Already aligned with recommended; nothing to do.
        return;
      }
      // Going ON -> OFF: warn the user about leaving the recommended set.
      setIsDisableModalOpen(true);
    },
    [useRecommendedDefaults]
  );

  const confirmResetToDefaults = useCallback(() => {
    setHasOptedIntoCustomMode(false);
    onEndpointsChange(featureId, [...effectiveRecommendedEndpoints]);
    setIsResetModalOpen(false);
  }, [featureId, effectiveRecommendedEndpoints, onEndpointsChange]);

  const confirmDisableRecommendedDefaults = useCallback(() => {
    // Seed the editable list with the recommended set so the user can customize from there.
    setHasOptedIntoCustomMode(true);
    onEndpointsChange(featureId, [...effectiveRecommendedEndpoints]);
    setIsDisableModalOpen(false);
  }, [featureId, effectiveRecommendedEndpoints, onEndpointsChange]);

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`subFeatureCard-${featureId}`}
        gutterSize="l"
        alignItems="baseline"
        wrap
      >
        <EuiFlexItem
          css={css`
            min-inline-size: min(20rem, 50%);
          `}
        >
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>{feature.featureName}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {(isTechPreview || isBeta) && (
              <EuiFlexItem grow={false}>
                <EuiBadgeGroup>
                  {isTechPreview && (
                    <EuiBadge>
                      {i18n.translate('xpack.searchInferenceEndpoints.settings.techPreview', {
                        defaultMessage: 'Technical Preview',
                      })}
                    </EuiBadge>
                  )}
                  {isBeta && (
                    <EuiBadge>
                      {i18n.translate('xpack.searchInferenceEndpoints.settings.betaBadge', {
                        defaultMessage: 'Beta',
                      })}
                    </EuiBadge>
                  )}
                </EuiBadgeGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{feature.featureDescription}</p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiSwitch
            data-test-subj={`useRecommendedDefaultsToggle-${featureId}`}
            label={i18n.translate(
              'xpack.searchInferenceEndpoints.settings.useRecommendedDefaults.label',
              { defaultMessage: 'Use recommended defaults' }
            )}
            checked={useRecommendedDefaults}
            onChange={(e) => handleToggleRecommendedDefaults(e.target.checked)}
          />
        </EuiFlexItem>

        <EuiFlexItem
          css={css`
            min-inline-size: min(20rem, 50%);
          `}
        >
          <EuiPanel color="subdued" paddingSize="s" hasBorder={false}>
            <EuiText size="xs" color="subdued">
              <strong>
                {i18n.translate('xpack.searchInferenceEndpoints.settings.assignedModels', {
                  defaultMessage: 'Assigned models',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />

            {useRecommendedDefaults ? (
              <RecommendedEndpointsList
                endpointIds={endpointIds}
                endpointDisplayMap={endpointDisplayMap}
                invalidEndpointIds={invalidEndpointIds}
              />
            ) : (
              <EuiDragDropContext onDragEnd={handleDragEnd}>
                <div ref={listRef}>
                  <EuiSplitPanel.Outer hasBorder>
                    <EuiDroppable droppableId={`assigned-models-${featureId}`} spacing="none">
                      {visibleEndpoints.map((endpointId, index) => (
                        <EuiDraggable
                          key={endpointId}
                          index={index}
                          draggableId={endpointId}
                          customDragHandle
                          hasInteractiveChildren
                        >
                          {(provided) => {
                            const { icon = 'compute', label = endpointId } =
                              endpointDisplayMap.get(endpointId) ?? {};
                            const isInvalid = invalidEndpointIds.has(endpointId);
                            return (
                              <div>
                                <EuiSplitPanel.Inner
                                  paddingSize="s"
                                  data-test-subj={`endpoint-row-${endpointId}`}
                                >
                                  <EuiFlexGroup alignItems="center" gutterSize="s">
                                    <EuiFlexItem grow={false}>
                                      <EuiPanel
                                        color="transparent"
                                        paddingSize="none"
                                        {...provided.dragHandleProps}
                                        aria-label={i18n.translate(
                                          'xpack.searchInferenceEndpoints.settings.dragHandle',
                                          { defaultMessage: 'Drag to reorder' }
                                        )}
                                      >
                                        <EuiIcon type="grab" size="s" color="subdued" aria-hidden />
                                      </EuiPanel>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      {isInvalid ? (
                                        <EuiIconTip
                                          type="warning"
                                          size="m"
                                          color="warning"
                                          content={i18n.translate(
                                            'xpack.searchInferenceEndpoints.settings.endpointUnavailable',
                                            {
                                              defaultMessage:
                                                'This inference endpoint is no longer available',
                                            }
                                          )}
                                          aria-label={i18n.translate(
                                            'xpack.searchInferenceEndpoints.settings.endpointUnavailable.ariaLabel',
                                            {
                                              defaultMessage:
                                                'Inference endpoint {label} is no longer available',
                                              values: { label },
                                            }
                                          )}
                                        />
                                      ) : (
                                        <EuiIcon type={icon} size="m" aria-hidden />
                                      )}
                                    </EuiFlexItem>
                                    <EuiFlexItem
                                      grow
                                      css={css`
                                        min-width: 0;
                                      `}
                                    >
                                      <EuiToolTip title={label} content={endpointId} position="top">
                                        <EuiText
                                          size="s"
                                          tabIndex={0}
                                          css={css`
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                            white-space: nowrap;
                                          `}
                                        >
                                          <span>{label}</span>
                                        </EuiText>
                                      </EuiToolTip>
                                    </EuiFlexItem>
                                    {index === 0 && (
                                      <EuiFlexItem grow={false}>
                                        <EuiBadge color="hollow">
                                          {i18n.translate(
                                            'xpack.searchInferenceEndpoints.settings.defaultBadge',
                                            { defaultMessage: 'Default' }
                                          )}
                                        </EuiBadge>
                                      </EuiFlexItem>
                                    )}
                                    <EuiFlexItem grow={false}>
                                      <EuiButtonIcon
                                        iconType="cross"
                                        aria-label={i18n.translate(
                                          'xpack.searchInferenceEndpoints.settings.removeModel',
                                          {
                                            defaultMessage: 'Remove model',
                                          }
                                        )}
                                        size="s"
                                        color="text"
                                        onClick={() => handleRemove(index)}
                                        isDisabled={endpointIds.length <= 1}
                                        data-test-subj={`remove-endpoint-${endpointId}`}
                                      />
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                </EuiSplitPanel.Inner>
                                {index !== visibleEndpoints.length - 1 && (
                                  <EuiHorizontalRule margin="none" />
                                )}
                              </div>
                            );
                          }}
                        </EuiDraggable>
                      ))}
                    </EuiDroppable>
                  </EuiSplitPanel.Outer>
                </div>
              </EuiDragDropContext>
            )}

            {!useRecommendedDefaults && (
              <>
                <EuiSpacer size="xs" />
                <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
                  {hasOverflow && !isExpanded && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        iconType="arrowDown"
                        size="s"
                        onClick={() => setIsExpanded(true)}
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
                  {(!hasOverflow || isExpanded) && canAddMore && (
                    <EuiFlexItem grow={false}>
                      <AddModelPopover
                        existingEndpointIds={endpointIds}
                        onAdd={handleAdd}
                        taskType={feature.taskType}
                        panelWidth={listWidth}
                      />
                    </EuiFlexItem>
                  )}
                  {(!hasOverflow || isExpanded) && hasOtherSubFeatures && (
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        button={
                          <EuiButtonIcon
                            iconType="boxesVertical"
                            aria-label={i18n.translate(
                              'xpack.searchInferenceEndpoints.settings.subFeatureOverflow.ariaLabel',
                              { defaultMessage: 'More actions' }
                            )}
                            color="text"
                            onClick={() => setIsOverflowOpen((prev) => !prev)}
                            data-test-subj={`subFeatureOverflowMenu-${featureId}`}
                          />
                        }
                        isOpen={isOverflowOpen}
                        closePopover={() => setIsOverflowOpen(false)}
                        panelPaddingSize="none"
                        anchorPosition="downRight"
                      >
                        <EuiContextMenu
                          initialPanelId={0}
                          panels={[
                            {
                              id: 0,
                              items: [
                                {
                                  name: i18n.translate(
                                    'xpack.searchInferenceEndpoints.settings.copyTo.button',
                                    { defaultMessage: 'Copy to' }
                                  ),
                                  icon: 'copy',
                                  'data-test-subj': `copyToMenuItem-${featureId}`,
                                  onClick: () => {
                                    setIsOverflowOpen(false);
                                    setIsCopyModalOpen(true);
                                  },
                                },
                              ],
                            },
                          ]}
                        />
                      </EuiPopover>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </>
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      {isCopyModalOpen && (
        <CopyToModal
          sourceFeatureName={feature.featureName}
          currentFeatureId={featureId}
          taskType={feature.taskType}
          onApply={handleCopyApply}
          onClose={() => setIsCopyModalOpen(false)}
        />
      )}
      {isDisableModalOpen && (
        <DisableRecommendedModelsModal
          onConfirm={confirmDisableRecommendedDefaults}
          onCancel={() => setIsDisableModalOpen(false)}
        />
      )}
      {isResetModalOpen && (
        <ResetToDefaultsModal
          onConfirm={confirmResetToDefaults}
          onCancel={() => setIsResetModalOpen(false)}
        />
      )}
    </>
  );
};

interface RecommendedEndpointsListProps {
  endpointIds: string[];
  endpointDisplayMap: Map<string, { icon: string; label: string }>;
  invalidEndpointIds: Set<string>;
}

const RecommendedEndpointsList: React.FC<RecommendedEndpointsListProps> = ({
  endpointIds,
  endpointDisplayMap,
  invalidEndpointIds,
}) => {
  return (
    <EuiSplitPanel.Outer hasBorder>
      {endpointIds.map((endpointId, index) => {
        const { icon = 'compute', label = endpointId } = endpointDisplayMap.get(endpointId) ?? {};
        const isInvalid = invalidEndpointIds.has(endpointId);
        return (
          <div key={endpointId}>
            <EuiSplitPanel.Inner
              paddingSize="s"
              data-test-subj={`endpoint-row-${endpointId}`}
              color="subdued"
            >
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  {isInvalid ? (
                    <EuiIconTip
                      type="warning"
                      size="m"
                      color="warning"
                      content={i18n.translate(
                        'xpack.searchInferenceEndpoints.settings.endpointUnavailable',
                        { defaultMessage: 'This inference endpoint is no longer available' }
                      )}
                    />
                  ) : (
                    <EuiIcon type={icon} size="m" color="subdued" aria-hidden />
                  )}
                </EuiFlexItem>
                <EuiFlexItem
                  grow
                  css={css`
                    min-width: 0;
                  `}
                >
                  <EuiText size="s" color="subdued">
                    <span>{label}</span>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            {index !== endpointIds.length - 1 && <EuiHorizontalRule margin="none" />}
          </div>
        );
      })}
    </EuiSplitPanel.Outer>
  );
};
