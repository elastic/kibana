/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { isEndpointPreconfigured } from '../../utils/preconfigured_endpoint_helper';

export interface ModelEndpointRowProps {
  endpoint: InferenceAPIConfigResponse;
  onView: (endpoint: InferenceAPIConfigResponse) => void;
  onCopy: (id: string) => void;
  onDelete?: (endpoint: InferenceAPIConfigResponse) => void;
}

export const ModelEndpointRow: React.FC<ModelEndpointRowProps> = ({
  endpoint,
  onView,
  onCopy,
  onDelete,
}) => {
  const preconfigured = isEndpointPreconfigured(endpoint.inference_id);

  return (
    <EuiSplitPanel.Inner paddingSize="s" data-test-subj={`endpoint-row-${endpoint.inference_id}`}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.searchInferenceEndpoints.modelDetailFlyout.viewEndpointTooltip',
                  { defaultMessage: 'View endpoint' }
                )}
              >
                <EuiButtonIcon
                  iconType="eye"
                  size="xs"
                  color="primary"
                  aria-label={i18n.translate(
                    'xpack.searchInferenceEndpoints.modelDetailFlyout.viewEndpointAriaLabel',
                    { defaultMessage: 'View endpoint' }
                  )}
                  onClick={() => onView(endpoint)}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{endpoint.inference_id}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.searchInferenceEndpoints.modelDetailFlyout.copyEndpointIdTooltip',
                  { defaultMessage: 'Copy endpoint ID' }
                )}
              >
                <EuiButtonIcon
                  iconType="copyClipboard"
                  size="xs"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.searchInferenceEndpoints.modelDetailFlyout.copyEndpointIdAriaLabel',
                    { defaultMessage: 'Copy endpoint ID' }
                  )}
                  onClick={() => onCopy(endpoint.inference_id)}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiBadge>{endpoint.task_type}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 24 }}>
              {preconfigured ? (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.searchInferenceEndpoints.modelDetailFlyout.preconfiguredTooltip',
                    {
                      defaultMessage:
                        'Preconfigured endpoints are system generated and can not be edited',
                    }
                  )}
                >
                  <span tabIndex={0}>
                    <EuiButtonIcon
                      iconType="lock"
                      size="xs"
                      isDisabled
                      aria-label={i18n.translate(
                        'xpack.searchInferenceEndpoints.modelDetailFlyout.preconfiguredAriaLabel',
                        { defaultMessage: 'Preconfigured endpoint' }
                      )}
                    />
                  </span>
                </EuiToolTip>
              ) : onDelete ? (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.searchInferenceEndpoints.modelDetailFlyout.deleteEndpointTooltip',
                    { defaultMessage: 'Delete endpoint' }
                  )}
                >
                  <EuiButtonIcon
                    iconType="trash"
                    size="xs"
                    color="danger"
                    aria-label={i18n.translate(
                      'xpack.searchInferenceEndpoints.modelDetailFlyout.deleteEndpointAriaLabel',
                      { defaultMessage: 'Delete endpoint' }
                    )}
                    onClick={() => onDelete(endpoint)}
                    data-test-subj={`deleteEndpointButton-${endpoint.inference_id}`}
                  />
                </EuiToolTip>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
};
