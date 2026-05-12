/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentType } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';
import type { AnnouncementModalVariantProps } from './variants/types';
import { NoPriorAssistantUsage } from './variants/no_prior_assistant_usage';
import { PriorAssistantAdminRevert } from './variants/prior_assistant_admin_revert';
import { PriorAssistantSpaceAdminRevert } from './variants/prior_assistant_space_admin_revert';

export type { AgentBuilderAnnouncementVariant } from './translations';

export interface AgentBuilderAnnouncementModalProps {
  variant: i18n.AgentBuilderAnnouncementVariant;
  onRevert: () => void;
  onContinue: () => void;
}

const VARIANT_CONTENT: Record<
  i18n.AgentBuilderAnnouncementVariant,
  ComponentType<AnnouncementModalVariantProps>
> = {
  '1a': NoPriorAssistantUsage,
  '1b': PriorAssistantSpaceAdminRevert,
  '2a': PriorAssistantAdminRevert,
};

const MODAL_MAX_WIDTH = 570;

/** Header product icon gradient (design: blue → purple). */
const AGENT_PRODUCT_ICON_GRADIENT_START = '#1750BA';
const AGENT_PRODUCT_ICON_GRADIENT_END = '#6B3C9F';

function AnnouncementModalHeader({ titleId }: { titleId: string }) {
  const gradientId = useGeneratedHtmlId({ prefix: 'agentBuilderAnnouncementAgentIconGradient' });
  const iconWrapperCss = css`
    display: inline-flex;
    line-height: 0;

    & .euiIcon,
    & .euiIcon [fill]:not([fill='none']) {
      fill: url(#${gradientId}) !important;
    }
  `;

  return (
    <EuiModalHeader>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <span css={iconWrapperCss}>
            <svg
              width="0"
              height="0"
              aria-hidden="true"
              focusable="false"
              style={{ position: 'absolute' }}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="-0.5"
                  y1="-2.5"
                  x2="15.5"
                  y2="9.5"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="16%" stopColor={AGENT_PRODUCT_ICON_GRADIENT_START} />
                  <stop offset="83%" stopColor={AGENT_PRODUCT_ICON_GRADIENT_END} />
                </linearGradient>
              </defs>
            </svg>
            <EuiIcon type="productAgent" size="xl" aria-hidden={true} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiModalHeaderTitle id={titleId}>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiModalHeader>
  );
}

export const AgentBuilderAnnouncementModal: React.FC<AgentBuilderAnnouncementModalProps> = ({
  variant,
  onRevert,
  onContinue,
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'agentBuilderAnnouncementModalTitle' });
  const VariantContent = VARIANT_CONTENT[variant];
  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onContinue}
      css={{ maxWidth: MODAL_MAX_WIDTH }}
      data-test-subj={`agentBuilderAnnouncementModal-${variant}`}
    >
      <AnnouncementModalHeader titleId={modalTitleId} />
      <VariantContent onContinue={onContinue} onRevert={onRevert} />
    </EuiModal>
  );
};
