/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiPanel,
  EuiPortal,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedRelative } from '@kbn/i18n-react';
import type { ImpactMapSlotRenderProps } from '@kbn/agentic-investigations-common';
import type { InvestigationImpactMapResponse } from '../../../../../common';
import { useInvestigation } from '../../../../investigations/hooks/use_investigation';
import type { ImpactMapRenderer } from '../../../../types';

const MAP_HEIGHT = 520;

const DEFAULT_TITLE = i18n.translate('xpack.agenticInvestigations.impactMap.defaultTitle', {
  defaultMessage: 'Impact map',
});
const EMPTY_TITLE = i18n.translate('xpack.agenticInvestigations.impactMap.emptyTitle', {
  defaultMessage: 'No impact map yet',
});
const EMPTY_BODY = i18n.translate('xpack.agenticInvestigations.impactMap.emptyBody', {
  defaultMessage:
    'The agent draws the map once it knows which entities the problem touches and how they depend on each other.',
});
const EMPTY_BODY_RUNNING = i18n.translate(
  'xpack.agenticInvestigations.impactMap.emptyBodyRunning',
  {
    defaultMessage:
      'The investigation is still running. The map appears here once the agent knows which entities the problem touches.',
  }
);
const MAXIMIZE_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.maximize', {
  defaultMessage: 'Full screen',
});
const CLOSE_FULL_SCREEN_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.exit', {
  defaultMessage: 'Exit full screen',
});
const UPDATED_LABEL = i18n.translate('xpack.agenticInvestigations.impactMap.updated', {
  defaultMessage: 'Updated',
});

/**
 * The Impact map tab: the investigation's impact map, drawn by the renderer a solution registered.
 * The map is read with the rest of the investigation, so it updates as the agent revises it.
 */
export const ImpactMapTab: React.FC<ImpactMapSlotRenderProps & { Renderer: ImpactMapRenderer }> = ({
  conversationId,
  Renderer,
}) => {
  const { data, isLoading } = useInvestigation(conversationId);

  if (isLoading) {
    return <EuiSkeletonRectangle width="100%" height={MAP_HEIGHT} borderRadius="m" />;
  }

  const impactMap = data?.impact_map;
  if (!impactMap || impactMap.entities.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj="agenticInvestigationsImpactMapEmpty"
        iconType="graphApp"
        title={<h3>{EMPTY_TITLE}</h3>}
        titleSize="xs"
        body={<p>{data?.in_progress ? EMPTY_BODY_RUNNING : EMPTY_BODY}</p>}
      />
    );
  }

  return <ImpactMapPanel impactMap={impactMap} Renderer={Renderer} />;
};

const ImpactMapPanel: React.FC<{
  impactMap: InvestigationImpactMapResponse;
  Renderer: ImpactMapRenderer;
}> = ({ impactMap, Renderer }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isMaximized) {
      return;
    }
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMaximized(false);
      }
    };
    document.addEventListener('keydown', exitOnEscape);
    return () => document.removeEventListener('keydown', exitOnEscape);
  }, [isMaximized]);
  const modalTitleId = useGeneratedHtmlId({ prefix: 'impactMapModalTitle' });
  const title = impactMap.title?.trim() || DEFAULT_TITLE;
  const { euiTheme } = useEuiTheme();
  const updatedAt = new Date(impactMap.updated_at ?? impactMap.created_at);

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      color="transparent"
      data-test-subj="agenticInvestigationsImpactMap"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiText size="xs" color="subdued" data-test-subj="agenticInvestigationsImpactMapUpdated">
            {UPDATED_LABEL}{' '}
            <EuiToolTip
              content={<FormattedDate value={updatedAt} dateStyle="medium" timeStyle="medium" />}
            >
              <FormattedRelative value={updatedAt} />
            </EuiToolTip>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={MAXIMIZE_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="fullScreen"
              aria-label={MAXIMIZE_LABEL}
              data-test-subj="agenticInvestigationsImpactMapMaximize"
              onClick={() => setIsMaximized(true)}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        css={css`
          height: ${MAP_HEIGHT}px;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
      >
        <Renderer impactMap={impactMap} />
      </div>
      {isMaximized && (
        <EuiPortal>
          <EuiFocusTrap>
            <div
              role="dialog"
              aria-labelledby={modalTitleId}
              data-test-subj="agenticInvestigationsImpactMapFullScreen"
              css={css`
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: ${euiTheme.levels.modal};
                display: flex;
                flex-direction: column;
                background: ${euiTheme.colors.backgroundBasePlain};
              `}
            >
              <EuiFlexGroup
                alignItems="center"
                responsive={false}
                css={css`
                  flex: none;
                  padding: ${euiTheme.size.m};
                `}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2 id={modalTitleId}>{title}</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={CLOSE_FULL_SCREEN_LABEL} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={CLOSE_FULL_SCREEN_LABEL}
                      data-test-subj="agenticInvestigationsImpactMapExitFullScreen"
                      onClick={() => setIsMaximized(false)}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
              <div
                css={css`
                  flex: 1;
                  min-height: 0;
                  position: relative;
                `}
              >
                <div
                  css={css`
                    position: absolute;
                    inset: 0;
                  `}
                >
                  <Renderer impactMap={impactMap} />
                </div>
              </div>
            </div>
          </EuiFocusTrap>
        </EuiPortal>
      )}
    </EuiPanel>
  );
};
