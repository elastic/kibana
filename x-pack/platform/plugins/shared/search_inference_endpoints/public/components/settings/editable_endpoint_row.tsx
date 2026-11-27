/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ReasoningEffortLevel } from '../../../common/types';
import type { EndpointDeprecationInfo } from '../../types';
import { ModelStatusBadge } from '../model_status/model_status_badge';
import { ADD_EFFORT_CLASS_NAME } from './add_effort_badge';
import { EffortBadge } from './effort_badge';
import { ReasoningEffortPopover } from './reasoning_effort_popover';

const NO_EFFORT_LEVELS: ReasoningEffortLevel[] = [];

const endpointRowStyles = css`
  &:hover .${ADD_EFFORT_CLASS_NAME} {
    opacity: 1;
  }
`;

interface EditableEndpointRowProps {
  endpointId: string;
  index: number;
  icon: string;
  label: string;
  isInvalid: boolean;
  deprecationInfo?: EndpointDeprecationInfo;
  supportedLevels?: ReasoningEffortLevel[];
  effort?: ReasoningEffortLevel;
  canManage: boolean;
  isRemoveDisabled: boolean;
  showDivider: boolean;
  onRemove: (index: number) => void;
  onEffortChange: (endpointId: string, effort?: ReasoningEffortLevel) => void;
}

export const EditableEndpointRow: React.FC<EditableEndpointRowProps> = ({
  endpointId,
  index,
  icon,
  label,
  isInvalid,
  deprecationInfo,
  supportedLevels,
  effort,
  canManage,
  isRemoveDisabled,
  showDivider,
  onRemove,
  onEffortChange,
}) => {
  const showEffortControl = supportedLevels !== undefined || effort !== undefined;

  return (
    <EuiDraggable index={index} draggableId={endpointId} customDragHandle hasInteractiveChildren>
      {(provided) => (
        <div>
          <EuiSplitPanel.Inner
            paddingSize="s"
            css={endpointRowStyles}
            data-test-subj={`endpoint-row-${endpointId}`}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s">
              {canManage && (
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
                    <EuiIcon type="dragVertical" size="s" color="subdued" aria-hidden />
                  </EuiPanel>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                {isInvalid ? (
                  <EuiIconTip
                    type="warning"
                    size="m"
                    color="warning"
                    content={i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.endpointUnavailable',
                      {
                        defaultMessage: 'This inference endpoint is no longer available',
                      }
                    )}
                    aria-label={i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.endpointUnavailable.ariaLabel',
                      {
                        defaultMessage: 'Inference endpoint {label} is no longer available',
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
              {deprecationInfo && (
                <ModelStatusBadge
                  id={endpointId}
                  status={deprecationInfo.status}
                  metadata={deprecationInfo.metadata}
                />
              )}
              {showEffortControl && (
                <EuiFlexItem grow={false}>
                  {canManage ? (
                    <ReasoningEffortPopover
                      endpointId={endpointId}
                      label={label}
                      effort={effort}
                      supportedLevels={supportedLevels ?? NO_EFFORT_LEVELS}
                      onChange={(newEffort) => onEffortChange(endpointId, newEffort)}
                    />
                  ) : (
                    effort !== undefined && <EffortBadge endpointId={endpointId} effort={effort} />
                  )}
                </EuiFlexItem>
              )}
              {canManage && (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate('xpack.searchInferenceEndpoints.settings.removeModel', {
                      defaultMessage: 'Remove model',
                    })}
                    disableScreenReaderOutput
                  >
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
                      onClick={() => onRemove(index)}
                      isDisabled={isRemoveDisabled}
                      data-test-subj={`remove-endpoint-${endpointId}`}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiSplitPanel.Inner>
          {showDivider && <EuiHorizontalRule margin="none" />}
        </div>
      )}
    </EuiDraggable>
  );
};
