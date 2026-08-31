/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiToolTip,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiSplitPanel,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

import { TASK_TYPE_DESCRIPTIONS } from '@kbn/inference-endpoint-ui-common';
import { docLinks } from '../../../common/doc_links';
import {
  isInferenceEndpointWithMetadata,
  isInferenceEndpointWithDisplayNameMetadata,
  isInferenceEndpointWithDisplayCreatorMetadata,
  isReasoningEffortLevel,
} from '../../../common/type_guards';
import { getModelId } from '../../utils/get_model_id';
import { AddEndpointModal } from './add_endpoint_modal';
import { ModelEndpointRow } from './model_endpoint_row';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';
import {
  getModelEOLDate,
  getModelReleaseDate,
  getModelStatus,
  getRegionPlaceName,
  getRegionZoneCounts,
} from '../../utils/eis_utils';
import { isModelUnavailableUnderRegionPolicy } from '../../utils/is_model_unavailable_under_region_policy';
import type { CspRegion, EisInferenceEndpoint } from '../../../common/types';
import { EisModelStatus } from '../../types';
import { ModelStatusBadge } from '../model_status/model_status_badge';

const TOOLTIP_MAX_VISIBLE_REGIONS = 5;

const getRegionBadgeTooltipContent = (modelRegions: CspRegion[]): string => {
  const names = modelRegions.map(getRegionPlaceName);
  const visible = names.slice(0, TOOLTIP_MAX_VISIBLE_REGIONS).join(', ');
  if (names.length > TOOLTIP_MAX_VISIBLE_REGIONS) {
    return `${visible} ${i18n.translate(
      'xpack.searchInferenceEndpoints.modelDetailFlyout.regionBadgeTooltip.andMore',
      {
        defaultMessage: 'and {count} more',
        values: { count: names.length - TOOLTIP_MAX_VISIBLE_REGIONS },
      }
    )}`;
  }
  return visible;
};

export interface ModelDetailFlyoutProps {
  modelId: string;
  allEndpoints: EisInferenceEndpoint[];
  onClose: () => void;
  onSaveEndpoint: () => void;
  onDeleteEndpoint?: (endpoint: EisInferenceEndpoint) => void;
  onCopyEndpointId: (id: string) => void;
  canManage?: boolean;
}

export const ModelDetailFlyout: React.FC<ModelDetailFlyoutProps> = ({
  modelId,
  allEndpoints,
  onClose,
  onSaveEndpoint,
  onDeleteEndpoint,
  onCopyEndpointId,
  canManage = true,
}) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<EisInferenceEndpoint | undefined>();
  const [isCalloutDismissed, setIsCalloutDismissed] = useState(false);
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load([EventType.EIS_MODEL_VIEWED, `${EventType.EIS_MODEL_VIEWED}_${modelId}`]);
  }, [usageTracker, modelId]);

  const {
    endpoints,
    displayName,
    modelAuthor,
    modelStatus,
    modelMetadata,
    modelReleaseDate,
    modelEOLDate,
    regionZoneCounts,
  } = useMemo(() => {
    const filtered = allEndpoints.filter((ep) => getModelId(ep) === modelId);

    const endpointWithName = filtered.find(isInferenceEndpointWithDisplayNameMetadata);
    const endpointWithCreator = filtered.find(isInferenceEndpointWithDisplayCreatorMetadata);
    const endpointModelMetadata = filtered.find(isInferenceEndpointWithMetadata)?.metadata;

    return {
      endpoints: filtered,
      displayName: endpointWithName ? endpointWithName.metadata.display.name : modelId,
      modelAuthor: endpointWithCreator
        ? endpointWithCreator.metadata.display.model_creator
        : i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.unknownAuthor', {
            defaultMessage: 'Unknown',
          }),
      modelStatus: getModelStatus(endpointModelMetadata),
      modelMetadata: endpointModelMetadata,
      modelReleaseDate: getModelReleaseDate(endpointModelMetadata)?.format('l') ?? '--',
      modelEOLDate: getModelEOLDate(endpointModelMetadata)?.format('l') ?? '--',
      regionZoneCounts: getRegionZoneCounts(filtered, allEndpoints),
    };
  }, [allEndpoints, modelId]);

  const { taskTypeOptions, uniqueTaskTypes } = useMemo(() => {
    const taskTypes = [...new Set(endpoints.map((e) => e.task_type))];
    return {
      uniqueTaskTypes: taskTypes,
      taskTypeOptions: taskTypes.map((tt) => ({
        value: tt,
        label: tt,
        description: TASK_TYPE_DESCRIPTIONS[tt] ?? '',
      })),
    };
  }, [endpoints]);

  const handleOpenAddModal = useCallback(() => {
    usageTracker.count([EventType.MODAL_OPENED, `${EventType.MODAL_OPENED}_add_endpoint`]);
    setEditingEndpoint(undefined);
    setIsModalOpen(true);
  }, [usageTracker]);

  const handleOpenEditModal = useCallback(
    (endpoint: EisInferenceEndpoint) => {
      usageTracker.count([EventType.MODAL_OPENED, `${EventType.MODAL_OPENED}_edit_endpoint`]);
      setEditingEndpoint(endpoint);
      setIsModalOpen(true);
    },
    [usageTracker]
  );

  const handleCloseModal = useCallback(() => {
    const modalKind = editingEndpoint ? 'edit_endpoint' : 'add_endpoint';
    usageTracker.count([EventType.MODAL_CLOSED, `${EventType.MODAL_CLOSED}_${modalKind}`]);
    setIsModalOpen(false);
    setEditingEndpoint(undefined);
  }, [usageTracker, editingEndpoint]);

  const handleDismissCallout = useCallback(() => {
    setIsCalloutDismissed(true);
  }, []);

  const showUnavailableCallout =
    !isCalloutDismissed && isModelUnavailableUnderRegionPolicy(allEndpoints, modelId);

  const initialReasoningEffort = useMemo(() => {
    const effort = editingEndpoint?.task_settings?.reasoning?.effort;
    return isReasoningEffortLevel(effort) ? effort : undefined;
  }, [editingEndpoint]);

  const descriptionListItems = [
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelAuthorLabel', {
        defaultMessage: 'Model author',
      }),
      description: modelAuthor,
    },
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelReleaseDate', {
        defaultMessage: 'Release date',
      }),
      description: modelReleaseDate,
    },
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.modelEndOfLifeDate', {
        defaultMessage: 'End-of-life date',
      }),
      description: modelEOLDate,
    },
    ...(regionZoneCounts.length > 0
      ? [
          {
            title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.regionsLabel', {
              defaultMessage: 'Regions',
            }),
            description: (
              <EuiBadgeGroup data-test-subj="flyoutRegionBadges">
                {regionZoneCounts.map(({ geo, modelCount, totalCount, modelRegions, geoOnly }) =>
                  geoOnly ? (
                    <EuiToolTip
                      key={geo}
                      content={i18n.translate(
                        'xpack.searchInferenceEndpoints.modelDetailFlyout.regionBadgeTooltip.geoOnly',
                        {
                          defaultMessage: 'Available in the {geo} zone',
                          values: { geo: geo.toUpperCase() },
                        }
                      )}
                    >
                      <EuiBadge tabIndex={0} data-test-subj={`flyoutRegionBadge-${geo}`}>
                        {geo.toUpperCase()}
                      </EuiBadge>
                    </EuiToolTip>
                  ) : (
                    <EuiToolTip
                      key={geo}
                      data-test-subj={`flyoutRegionBadgeTooltip-${geo}`}
                      title={i18n.translate(
                        'xpack.searchInferenceEndpoints.modelDetailFlyout.regionBadgeTooltip.title',
                        {
                          defaultMessage: 'Available in {count} of {total} regions',
                          values: { count: modelCount, total: totalCount },
                        }
                      )}
                      content={getRegionBadgeTooltipContent(modelRegions)}
                    >
                      <EuiBadge tabIndex={0} data-test-subj={`flyoutRegionBadge-${geo}`}>
                        {`${geo.toUpperCase()} (${modelCount}/${totalCount})`}
                      </EuiBadge>
                    </EuiToolTip>
                  )
                )}
              </EuiBadgeGroup>
            ),
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.documentationLabel', {
        defaultMessage: 'Documentation',
      }),
      description: (
        <EuiLink
          data-test-subj="searchInferenceEndpointsModelDetailFlyoutViewDocumentationLink"
          href={docLinks.elasticInferenceService}
          target="_blank"
          external
        >
          {i18n.translate(
            'xpack.searchInferenceEndpoints.modelDetailFlyout.viewDocumentationLink',
            { defaultMessage: 'View documentation' }
          )}
        </EuiLink>
      ),
    },
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={flyoutTitleId}
      data-test-subj="modelDetailFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{displayName}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiBadgeGroup data-test-subj="flyoutTaskBadges">
          <ModelStatusBadge id={modelId} status={modelStatus} metadata={modelMetadata} />
          {uniqueTaskTypes.map((taskType) => (
            <EuiBadge key={taskType}>{taskType}</EuiBadge>
          ))}
        </EuiBadgeGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {showUnavailableCallout && (
          <KbnWarningCallout
            title={i18n.translate(
              'xpack.searchInferenceEndpoints.modelDetailFlyout.regionPreferencesUnavailableTitle',
              { defaultMessage: 'Model not available based on region preferences' }
            )}
            announceOnMount={false}
            onDismiss={handleDismissCallout}
            dismissButtonProps={{
              'data-test-subj': 'modelDetailFlyoutRegionUnavailableCalloutDismiss',
            }}
            data-test-subj="modelDetailFlyoutRegionUnavailableCallout"
            text={i18n.translate(
              'xpack.searchInferenceEndpoints.modelDetailFlyout.regionPreferencesUnavailableDescription',
              {
                defaultMessage:
                  "This model isn't available in the locations allowed by your region preferences. To use it, update your region preferences to include a supported location.",
              }
            )}
          />
        )}
        {showUnavailableCallout && <EuiSpacer size="m" />}
        <EuiDescriptionList
          type="column"
          compressed
          columnGutterSize="m"
          listItems={descriptionListItems}
          data-test-subj="flyoutModelDetails"
        />

        <EuiHorizontalRule margin="xxl" />

        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs">
                  <h3>
                    {i18n.translate(
                      'xpack.searchInferenceEndpoints.modelDetailFlyout.modelEndpointsTitle',
                      { defaultMessage: 'Model endpoints' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              {canManage && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconType="plusCircle"
                    color="text"
                    onClick={handleOpenAddModal}
                    disabled={modelStatus === EisModelStatus.DeprecatedEOL}
                    data-test-subj="modelDetailFlyoutAddEndpointButton"
                  >
                    {i18n.translate(
                      'xpack.searchInferenceEndpoints.modelDetailFlyout.addEndpointButton',
                      { defaultMessage: 'Add endpoint' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiSplitPanel.Outer hasBorder>
              {endpoints.map((endpoint, index) => (
                <React.Fragment key={endpoint.inference_id}>
                  <ModelEndpointRow
                    endpoint={endpoint}
                    onView={handleOpenEditModal}
                    onCopy={onCopyEndpointId}
                    onDelete={canManage ? onDeleteEndpoint : undefined}
                  />
                  {index !== endpoints.length - 1 && <EuiHorizontalRule margin="none" />}
                </React.Fragment>
              ))}
            </EuiSplitPanel.Outer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="modelDetailFlyoutCloseButton">
              {i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.closeButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
      {isModalOpen && (
        <AddEndpointModal
          mode={editingEndpoint ? 'view' : 'add'}
          modelId={modelId}
          taskTypes={taskTypeOptions}
          initialEndpointId={editingEndpoint?.inference_id}
          initialTaskType={editingEndpoint?.task_type}
          initialReasoningEffort={initialReasoningEffort}
          onSave={onSaveEndpoint}
          onCancel={handleCloseModal}
        />
      )}
    </EuiFlyout>
  );
};
