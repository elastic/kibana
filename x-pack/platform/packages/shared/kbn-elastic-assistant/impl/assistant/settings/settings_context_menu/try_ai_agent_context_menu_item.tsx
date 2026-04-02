/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiContextMenuItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import * as i18n from './translations';

export const TryAIAgentContextMenuItem: React.FC<{
  analytics?: AnalyticsServiceStart;
  hasAgentBuilderManagePrivilege?: boolean;
  handleOpenAIAgentModal: (s: 'security_ab_tour' | 'security_settings_menu') => void;
}> = ({ analytics, hasAgentBuilderManagePrivilege, handleOpenAIAgentModal }) => {
  const didReport = useRef(false);
  useEffect(() => {
    if (!didReport.current) {
      analytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
        action: 'step_reached',
        source: 'security_settings_menu',
      });
      didReport.current = true;
    }
  }, [analytics]);
  return (
    <EuiContextMenuItem key="try-ai-agent">
      {!hasAgentBuilderManagePrivilege ? (
        <EuiToolTip
          display="block"
          content={i18n.AI_AGENT_MANAGE_PRIVILEGE_REQUIRED}
          anchorClassName="euiToolTipAnchor-try-ai-agent"
        >
          <span
            tabIndex={0}
            css={css`
              display: block;
              width: 100%;
            `}
          >
            <AiButton
              aria-label={i18n.TRY_AI_AGENT}
              onClick={() => handleOpenAIAgentModal('security_settings_menu')}
              iconType="productAgent"
              variant="base"
              size="s"
              fullWidth
              isDisabled={!hasAgentBuilderManagePrivilege}
              data-test-subj="try-ai-agent"
              css={css`
                font-weight: 500;
              `}
            >
              {i18n.TRY_AI_AGENT}
            </AiButton>
          </span>
        </EuiToolTip>
      ) : (
        <AiButton
          aria-label={i18n.TRY_AI_AGENT}
          onClick={() => handleOpenAIAgentModal('security_settings_menu')}
          iconType="productAgent"
          variant="base"
          size="s"
          fullWidth
          isDisabled={!hasAgentBuilderManagePrivilege}
          data-test-subj="try-ai-agent"
          css={css`
            font-weight: 500;
          `}
        >
          {i18n.TRY_AI_AGENT}
        </AiButton>
      )}
    </EuiContextMenuItem>
  );
};
