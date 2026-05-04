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
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  euiDragDropReorder,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import { useRegisteredFeatures } from '../../hooks/use_registered_features';
import { getConnectorIcon } from '../../utils/connector_display';
import type { InferenceFeatureResponse as InferenceFeatureConfig } from '../../../common/types';
import { AddModelPopover } from './add_model_popover';
import { CopyToModal } from './copy_to_modal';
import { useConnectors } from '../../hooks/use_connectors';

const COLLAPSED_COUNT = 5;

interface SubFeatureCardProps {
  featureId: string;
  feature: InferenceFeatureConfig;
  endpointIds: string[];
  onEndpointsChange: (featureId: string, newEndpointIds: string[]) => void;
  invalidEndpointIds: Set<string>;
  globalDefaultId: string;
  hasSavedObject: boolean;
  isFeatureDirty: boolean;
}

export const SubFeatureCard: React.FC<SubFeatureCardProps> = ({
  featureId,
  feature,
  endpointIds,
  onEndpointsChange,
  invalidEndpointIds,
  globalDefaultId,
  hasSavedObject,
  isFeatureDirty,
}) => {
  const { data: connectors = [] } = useConnectors();
  const { features: registeredFeatures } = useRegisteredFeatures();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [listWidth, setListWidth] = useState<number | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const { isTechPreview, isBeta } = feature;

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
  const showGlobalDefaultRow = !hasSavedObject && globalDefaultId !== NO_DEFAULT_MODEL;
  const { icon: globalDefaultIcon = 'compute', label: globalDefaultLabel = globalDefaultId } =
    endpointDisplayMap.get(globalDefaultId) ?? {};
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
            {isTechPreview || isBeta ? (
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
            ) : null}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{feature.featureDescription}</p>
          </EuiText>
          {feature.taskType && (
            <>
              <EuiSpacer size="s" />
              <div>
                <EuiBadge>{feature.taskType}</EuiBadge>
              </div>
            </>
          )}
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

            <EuiDragDropContext onDragEnd={handleDragEnd}>
              <div ref={listRef}>
                <EuiSplitPanel.Outer hasBorder>
                  {showGlobalDefaultRow && (
                    <>
                      <EuiSplitPanel.Inner
                        paddingSize="s"
                        color="subdued"
                        data-test-subj={`global-default-row-${featureId}`}
                      >
                        <EuiFlexGroup alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiPanel color="transparent" paddingSize="none">
                              <EuiIcon type="lock" size="s" color="subdued" aria-hidden />
                            </EuiPanel>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiIcon type={globalDefaultIcon} size="m" aria-hidden />
                          </EuiFlexItem>
                          <EuiFlexItem grow>
                            <EuiToolTip
                              title={globalDefaultLabel}
                              content={globalDefaultId}
                              position="top"
                            >
                              <EuiText
                                size="s"
                                color="subdued"
                                tabIndex={0}
                                css={css`
                                  overflow: hidden;
                                  text-overflow: ellipsis;
                                  white-space: nowrap;
                                `}
                              >
                                <span>{globalDefaultLabel}</span>
                              </EuiText>
                            </EuiToolTip>
                          </EuiFlexItem>
                          {!isFeatureDirty && (
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                color="hollow"
                                data-test-subj={`global-default-badge-${featureId}`}
                              >
                                {i18n.translate(
                                  'xpack.searchInferenceEndpoints.settings.globalDefaultBadge',
                                  { defaultMessage: 'Global default' }
                                )}
                              </EuiBadge>
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                      </EuiSplitPanel.Inner>
                      <EuiHorizontalRule margin="none" />
                    </>
                  )}
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
                                  {index === 0 && !showGlobalDefaultRow && (
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
                    panelWidth={listWidth}
                  />
                </EuiFlexItem>
              )}
              {(!hasOverflow || isExpanded) && hasOtherSubFeatures && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="copy"
                    size="s"
                    color="text"
                    onClick={() => setIsCopyModalOpen(true)}
                    data-test-subj={`copy-to-${featureId}`}
                  >
                    {i18n.translate('xpack.searchInferenceEndpoints.settings.copyTo.button', {
                      defaultMessage: 'Copy to',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
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
    </>
  );
};
