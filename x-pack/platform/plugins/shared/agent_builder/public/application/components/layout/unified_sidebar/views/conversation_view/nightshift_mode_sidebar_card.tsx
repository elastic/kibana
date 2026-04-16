/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useObservabilityNightshiftEnabled } from '../../../../../hooks/use_observability_nightshift_enabled';
import { labels } from '../../../../../utils/i18n';
import nightshiftIllustration from '../../../../agents/overview/assets/nightshift_illustration.svg';

const { embeddableSidebar: nightshiftLabels } = labels;

const ILLUSTRATION_BAND_HEIGHT = '72px';

/**
 * Nightshift promo + toggle for the Agent Builder **unified** left sidebar
 * (`UnifiedSidebar`), above “Manage components”. Parent should render only for
 * `observability.agent`. Renders nothing when Nightshift is already enabled.
 */
export const NightshiftModeSidebarCard: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { notifications },
  } = useKibana();
  const [nightshiftEnabled, setNightshiftEnabled] = useObservabilityNightshiftEnabled();

  const onTurnOn = useCallback(() => {
    setNightshiftEnabled(true);
    notifications.toasts.addSuccess({
      title: nightshiftLabels.nightshiftToastEnabled,
    });
  }, [notifications.toasts, setNightshiftEnabled]);

  if (nightshiftEnabled) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiHorizontalRule margin="none" />
      <div
        css={css`
          flex-shrink: 0;
          padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.s};
        `}
        data-test-subj="agentBuilderUnifiedSidebarNightshiftCard"
      >
        <EuiPanel hasBorder paddingSize="none">
          <div
            css={css`
              width: 100%;
              height: ${ILLUSTRATION_BAND_HEIGHT};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <img
              src={nightshiftIllustration}
              alt=""
              width={56}
              height={56}
              css={css`
                object-fit: contain;
              `}
            />
          </div>
          <div
            css={css`
              padding: ${euiTheme.size.base};
            `}
          >
            <EuiTitle size="xxs">
              <h3>{nightshiftLabels.nightshiftTitle}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <p>{nightshiftLabels.nightshiftDescription}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <AiButton
              size="s"
              variant="base"
              iconType="productAgent"
              fullWidth
              onClick={onTurnOn}
              data-test-subj="agentBuilderUnifiedSidebarNightshiftTurnOn"
            >
              {nightshiftLabels.nightshiftTurnOn}
            </AiButton>
          </div>
        </EuiPanel>
      </div>
    </EuiFlexItem>
  );
};
