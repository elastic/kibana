/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  euiTextTruncate,
  EuiText,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { type RefObject } from 'react';
import { KiFormattedDate } from '../ki/shared/ki_formatted_date';
import type { KiGraphSource } from './ki_graph_source';

const SPOTLIGHT_HERO_WIDTH = 340;

const closeLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.close', {
  defaultMessage: 'Close spotlight',
});

const viewDocumentLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.viewDocument', {
  defaultMessage: 'View document',
});

const memoryKindLabel = i18n.translate('xpack.contextEngine.kiGraph.spotlight.memoryKind', {
  defaultMessage: 'Memory',
});

const shortConversationId = (conversationId: string): string => {
  if (conversationId.length <= 12) {
    return conversationId;
  }
  return `${conversationId.slice(0, 6)}…${conversationId.slice(-4)}`;
};

const sourceMemoryIconType = (hasAgent: boolean): 'compute' | 'comment' =>
  hasAgent ? 'compute' : 'comment';

interface MemoryHeroIconTileProps {
  hasAgent: boolean;
}

const MemoryHeroIconTile = ({ hasAgent }: MemoryHeroIconTileProps) => {
  const { euiTheme } = useEuiTheme();
  const tileCss = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: euiTheme.size.xl,
    height: euiTheme.size.xl,
    borderRadius: euiTheme.border.radius.medium,
    background: euiTheme.colors.backgroundLightNeutral,
    color: euiTheme.colors.text,
  });

  return (
    <span css={tileCss} aria-hidden>
      <EuiIcon type={sourceMemoryIconType(hasAgent)} size="m" aria-hidden={true} />
    </span>
  );
};

export interface KiGraphMemoryHeroProps {
  source: KiGraphSource;
  heroRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onViewSource: (source: KiGraphSource) => void;
}

export const KiGraphMemoryHero = ({
  source,
  heroRef,
  onClose,
  onViewSource,
}: KiGraphMemoryHeroProps) => {
  const { euiTheme } = useEuiTheme();
  const extraSmallFontSize = useEuiFontSize('xs').fontSize;

  const heroCss = css({
    pointerEvents: 'auto',
    position: 'relative',
    width: SPOTLIGHT_HERO_WIDTH,
  });

  const closeCss = css({
    position: 'absolute',
    top: euiTheme.size.s,
    right: euiTheme.size.s,
  });

  const heroTitleCss = css({
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
    margin: 0,
  });

  const heroHeaderCss = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: euiTheme.size.m,
    paddingRight: euiTheme.size.xl,
  });

  const metaCss = css({
    display: 'flex',
    flexDirection: 'column',
    gap: euiTheme.size.xs,
    minWidth: 0,
  });

  const agentCss = css(euiTextTruncate('100%'), {
    display: 'block',
  });

  const conversationCss = css(euiTextTruncate('100%'), {
    display: 'block',
    fontFamily: euiTheme.font.familyCode,
    fontSize: extraSmallFontSize,
    color: euiTheme.colors.textSubdued,
  });

  return (
    <div ref={heroRef} css={heroCss}>
      <EuiPanel hasShadow paddingSize="l">
        <div css={closeCss}>
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              aria-label={closeLabel}
              onClick={onClose}
              data-test-subj="contextKiGraphSpotlightClose"
            />
          </EuiToolTip>
        </div>

        <div css={heroHeaderCss}>
          <MemoryHeroIconTile hasAgent={source.agentName !== undefined} />
          <div css={metaCss}>
            <EuiText size="m">
              <h2 css={heroTitleCss} data-test-subj="contextKiGraphSpotlightHeroTitle">
                {source.title}
              </h2>
            </EuiText>
            <p css={css({ margin: 0 })}>
              <EuiBadge color="hollow">{memoryKindLabel}</EuiBadge>
            </p>
          </div>
        </div>

        <EuiHorizontalRule margin="m" />

        <div css={css({ display: 'flex', flexDirection: 'column', gap: euiTheme.size.s })}>
          {source.agentName !== undefined ? (
            <EuiText size="xs" color="subdued">
              <span css={agentCss} title={source.agentName}>
                {source.agentName}
              </span>
            </EuiText>
          ) : null}
          {source.recordedAt !== undefined ? (
            <EuiText size="xs" color="subdued">
              <KiFormattedDate value={source.recordedAt} />
            </EuiText>
          ) : null}
          {source.conversationId !== undefined ? (
            <span css={conversationCss} title={source.conversationId}>
              {shortConversationId(source.conversationId)}
            </span>
          ) : null}
        </div>

        <p css={css({ margin: `${euiTheme.size.m} 0 0` })}>
          <EuiButton
            size="s"
            fill
            fullWidth
            onClick={() => onViewSource(source)}
            data-test-subj="contextKiGraphSpotlightViewDocument"
          >
            {viewDocumentLabel}
          </EuiButton>
        </p>
      </EuiPanel>
    </div>
  );
};
