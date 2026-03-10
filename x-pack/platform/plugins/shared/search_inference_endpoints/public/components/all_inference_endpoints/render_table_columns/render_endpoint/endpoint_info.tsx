/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBetaBadge,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { isEndpointPreconfigured } from '../../../../utils/preconfigured_endpoint_helper';
import * as i18n from './translations';
import { isProviderTechPreview } from '../../../../utils/reranker_helper';

const COPIED_ICON_DISPLAY_DURATION_MS = 1000;

const containerStyles = css`
  &:hover .copyButton {
    opacity: 1;
  }
`;

const getCopyButtonStyles =
  (visible: boolean) =>
  ({ euiTheme }: UseEuiTheme) =>
    css`
      opacity: ${visible ? 1 : 0};
      transition: opacity ${euiTheme.animation.fast} ease-in-out;

      &:focus {
        opacity: 1;
      }
    `;

export interface EndpointInfoProps {
  inferenceId: string;
  endpointInfo: InferenceInferenceEndpointInfo;
}

export const EndpointInfo: React.FC<EndpointInfoProps> = ({ inferenceId, endpointInfo }) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { task_type: taskType } = endpointInfo;
  const isPreconfigured = isEndpointPreconfigured(inferenceId);
  const isTechPreview = isProviderTechPreview(endpointInfo);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback((copyFn: () => void) => {
    copyFn();
    setIsCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, COPIED_ICON_DISPLAY_DURATION_MS);
  }, []);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={containerStyles}>
          <EuiFlexItem grow={false}>
            <strong>{inferenceId}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="copyButton" css={getCopyButtonStyles(isCopied)}>
            <EuiCopy textToCopy={inferenceId} afterMessage={i18n.COPY_ID_COPIED}>
              {(copy) => (
                <EuiButtonIcon
                  size="xs"
                  display="empty"
                  onClick={() => handleCopy(copy)}
                  iconType={isCopied ? 'check' : 'copy'}
                  color={isCopied ? 'success' : 'text'}
                  data-test-subj={
                    isCopied
                      ? 'inference-endpoint-copy-id-button-copied'
                      : 'inference-endpoint-copy-id-button'
                  }
                  aria-label={isCopied ? i18n.COPY_ID_COPIED : i18n.COPY_ID_TO_CLIPBOARD}
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadgeGroup gutterSize="xs">
          {taskType != null && (
            <EuiToolTip content={i18n.TASK_TYPE_TOOLTIPS[taskType] ?? taskType}>
              <EuiBadge
                tabIndex={0}
                data-test-subj={`table-column-task-type-${taskType}`}
                color="hollow"
              >
                {taskType}
              </EuiBadge>
            </EuiToolTip>
          )}
          {isPreconfigured && (
            <EuiToolTip content={i18n.PRECONFIGURED_TOOLTIP}>
              <EuiBadge tabIndex={0} data-test-subj="preconfiguredBadge" color="hollow">
                {i18n.PRECONFIGURED_LABEL}
              </EuiBadge>
            </EuiToolTip>
          )}
          {isTechPreview && (
            <EuiBetaBadge
              tabIndex={0}
              label={i18n.TECH_PREVIEW_LABEL}
              tooltipContent={i18n.TECH_PREVIEW_TOOLTIP}
              size="s"
              color="subdued"
              alignment="middle"
              data-test-subj="techPreviewBadge"
            />
          )}
        </EuiBadgeGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
