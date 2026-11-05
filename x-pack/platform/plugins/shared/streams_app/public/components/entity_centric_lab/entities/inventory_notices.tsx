/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stand-ins for banner and callout components that landed in Kibana after
 * this branch's EUI (@elastic/eui 114 has no `EuiBanner`).
 *
 * - `LabAnnouncementBanner` follows `EuiBanner` / `@kbn/announcement-banner`
 *   (`AnnouncementBanner`): highlighted panel, illustration, at most one
 *   primary and one secondary action, dismiss in the corner. Container
 *   queries switch between stacked, row, and wide layouts.
 * - `LabTruncationCallout` follows the current `EuiCallOut`: notification
 *   icon beside the copy, semantic border, and a compact title · text row.
 *   Use it for the 10k limit. That message is a warning, not a product
 *   announcement, so it stays a callout.
 */

import React, { type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiBackgroundColorCSS,
  useEuiBorderColorCSS,
  useEuiMemoizedStyles,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ScenarioVariation } from './variation_registry';

const ILLUSTRATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="none"><mask id="a" width="72" height="71" x="4" y="5" maskUnits="userSpaceOnUse" style="mask-type:luminance"><path fill="#fff" d="M75.131 5H4.375v70.081h70.756z"/></mask><g mask="url(#a)"><path fill="#153385" stroke="#101c3f" stroke-miterlimit="10" stroke-width="1.607" d="M42.788 8.631c-17.432 0-31.563 14.132-31.563 31.563s14.131 31.562 31.563 31.562c17.43 0 31.562-14.13 31.562-31.562C74.35 22.763 60.22 8.63 42.788 8.63Zm0 53.625c-12.188 0-22.07-9.88-22.07-22.068s9.882-22.07 22.07-22.07c12.187 0 22.068 9.882 22.068 22.07 0 12.187-9.88 22.068-22.068 22.068Z"/><path fill="#153385" stroke="#101c3f" stroke-miterlimit="10" stroke-width="1.607" d="M41.525 51.6c6.3 0 11.406-5.106 11.406-11.406s-5.106-11.406-11.406-11.406-11.406 5.106-11.406 11.406S35.225 51.6 41.525 51.6Z"/><path fill="#0b64dd" stroke="#101c3f" stroke-miterlimit="10" stroke-width="1.607" d="M39.938 8.631c-17.432 0-31.563 14.132-31.563 31.557S22.506 71.75 39.938 71.75c17.43 0 31.562-14.131 31.562-31.562S57.369 8.63 39.938 8.63Zm0 53.625c-12.188 0-22.07-9.88-22.07-22.068s9.882-22.07 22.07-22.07c12.187 0 22.068 9.882 22.068 22.07 0 12.187-9.881 22.068-22.068 22.068Z"/><path fill="#48efcf" stroke="#101c3f" stroke-miterlimit="10" stroke-width="1.607" d="M39.938 51.6c6.3 0 11.406-5.106 11.406-11.406s-5.107-11.406-11.407-11.406-11.406 5.106-11.406 11.406S33.638 51.6 39.938 51.6Z"/><path stroke="#153385" stroke-miterlimit="10" stroke-width="1.607" d="M39.938 5v17.088M39.938 57.987v17.088M75.131 39.913H58.044M21.463 39.913H4.374"/><path fill="#fff" d="M31.837 40.25s7.175-10.25 16.2 0c0 0-6.968 9.637-16.2 0"/><path fill="#101c3f" d="M39.756 44.181a4 4 0 1 0 0-8c-2.212 0-4 1.788-4 4 0 2.213 1.788 4 4 4"/></g></svg>`;

const AnnouncementIllustration = () => (
  <img
    alt=""
    aria-hidden="true"
    src={`data:image/svg+xml,${encodeURIComponent(ILLUSTRATION_SVG)}`}
  />
);

type BannerSize = 's' | 'm';
type BannerLayout = 'narrow' | 'wide';

const CONTAINER_NAME = 'labAnnouncementBanner';
const CQC_BREAKPOINTS: Record<BannerSize, Record<BannerLayout, string>> = {
  s: {
    narrow: '(min-width: 401px)',
    wide: '(min-width: 800px)',
  },
  m: {
    narrow: '(min-width: 601px)',
    wide: '(min-width: 1000px)',
  },
};
const CQC_BREAKPOINT_NARROWEST = '(max-width: 400px)';
const TEXT_MAX_WIDTH = 1200;

const withContainerQuery = ({ layout, styles }: { layout: BannerLayout; styles: string }): string =>
  (Object.keys(CQC_BREAKPOINTS) as BannerSize[])
    .map(
      (sizeKey) => `
        @container ${CONTAINER_NAME}--${sizeKey} ${CQC_BREAKPOINTS[sizeKey][layout]} {
          ${styles}
        }
      `
    )
    .join('\n');

const labAnnouncementBannerStyles = ({ euiTheme }: UseEuiTheme) => ({
  banner: css`
    container-name: ${CONTAINER_NAME};
    container-type: inline-size;
    position: relative;
    flex-grow: 0;
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};

    &[data-size='s'] {
      container-name: ${CONTAINER_NAME} ${CONTAINER_NAME}--s;
    }

    &[data-size='m'] {
      container-name: ${CONTAINER_NAME} ${CONTAINER_NAME}--m;
    }
  `,
  container: css`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: ${euiTheme.size.m};
    padding-inline: ${euiTheme.size.base};

    [data-size='m'] & {
      padding-block: ${euiTheme.size.base};
    }

    [data-size='s'] & {
      padding-block: ${euiTheme.size.m};
    }

    ${withContainerQuery({
      layout: 'narrow',
      styles: `
        flex-direction: row;
        align-items: flex-start;
        gap: ${euiTheme.size.base};
      `,
    })}
  `,
  media: css`
    --labAnnouncementBannerMediaSize: calc(${euiTheme.size.base} * 5);
    flex-shrink: 0;
    inline-size: var(--labAnnouncementBannerMediaSize);
    block-size: var(--labAnnouncementBannerMediaSize);
    aspect-ratio: 1 / 1;

    [data-size='s'] & {
      --labAnnouncementBannerMediaSize: calc(${euiTheme.size.base} * 2);
    }

    ${withContainerQuery({
      layout: 'wide',
      styles: `
        align-self: center;
      `,
    })}

    img,
    svg {
      block-size: 100%;
      inline-size: 100%;
    }
  `,
  body: css`
    flex: 1 1 auto;
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    align-self: flex-start;
    inline-size: 100%;
    gap: ${euiTheme.size.m};

    ${withContainerQuery({
      layout: 'narrow',
      styles: `
        align-self: center;
        inline-size: auto;
      `,
    })}

    ${withContainerQuery({
      layout: 'wide',
      styles: `
        flex-direction: row;
        align-items: center;
        align-self: stretch;
        justify-content: space-between;
        gap: ${euiTheme.size.xxl};
      `,
    })}
  `,
  content: css`
    flex: 1 1 auto;
    min-inline-size: 0;
    max-inline-size: ${TEXT_MAX_WIDTH}px;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
  `,
  actions: css`
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    gap: ${euiTheme.size.s};

    @container ${CONTAINER_NAME} ${CQC_BREAKPOINT_NARROWEST} {
      flex-wrap: wrap;

      > * {
        inline-size: 100%;
      }
    }

    ${withContainerQuery({
      layout: 'wide',
      styles: `
        flex-direction: row-reverse;
        flex-shrink: 0;
        align-self: center;
      `,
    })}
  `,
  hasDismiss: css`
    ${withContainerQuery({
      layout: 'narrow',
      styles: `
        padding-inline-end: calc(${euiTheme.size.s} * 5);
      `,
    })}
  `,
  dismiss: css`
    position: absolute;
    inset-block-start: ${euiTheme.size.s};
    inset-inline-end: ${euiTheme.size.s};
    color: ${euiTheme.colors.textSubdued};
  `,
});

export interface LabAnnouncementBannerProps {
  title: string;
  text?: ReactNode;
  onTakeTour: () => void;
  onRevert?: () => void;
  onDismiss: () => void;
}

/**
 * Product announcement. Mirrors `EuiBanner` with the default highlighted
 * color, medium size, and the Kibana announcement illustration.
 */
export const LabAnnouncementBanner = ({
  title,
  text,
  onTakeTour,
  onRevert,
  onDismiss,
}: LabAnnouncementBannerProps): JSX.Element => {
  const styles = useEuiMemoizedStyles(labAnnouncementBannerStyles);
  const backgroundColorStyles = useEuiBackgroundColorCSS().highlighted;
  const dismissAriaLabel = i18n.translate(
    'xpack.streams.entityCentricLab.announcementBanner.dismissAriaLabel',
    {
      defaultMessage: 'Dismiss "{title}" announcement',
      values: { title },
    }
  );

  return (
    <div
      className="labAnnouncementBanner"
      css={[styles.banner, backgroundColorStyles]}
      data-size="m"
      data-color="highlighted"
      data-test-subj="entityCentricLabAnnouncementBanner"
    >
      <div css={[styles.container, styles.hasDismiss]}>
        <div css={styles.media} data-test-subj="entityCentricLabAnnouncementBanner-media">
          <AnnouncementIllustration />
        </div>
        <div css={styles.body}>
          <div css={styles.content}>
            <EuiTitle size="xs">
              <h3 data-test-subj="entityCentricLabAnnouncementBanner-title">{title}</h3>
            </EuiTitle>
            <span css={styles.dismiss}>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                aria-label={dismissAriaLabel}
                data-test-subj="entityCentricLabAnnouncementBanner-dismiss"
                onClick={onDismiss}
              />
            </span>
            {text ? (
              <EuiText
                size="s"
                color="subdued"
                data-test-subj="entityCentricLabAnnouncementBanner-text"
              >
                {text}
              </EuiText>
            ) : null}
          </div>
          <div css={styles.actions} data-test-subj="entityCentricLabAnnouncementBanner-actions">
            <EuiButton
              color="primary"
              size="s"
              onClick={onTakeTour}
              data-test-subj="entityCentricLabAnnouncementBanner-primaryAction"
            >
              <FormattedMessage
                id="xpack.streams.entityCentricLab.announcementBanner.takeTourLabel"
                defaultMessage="Take a tour"
              />
            </EuiButton>
            {onRevert ? (
              <EuiButtonEmpty
                color="primary"
                size="s"
                onClick={onRevert}
                data-test-subj="entityCentricLabAnnouncementBanner-secondaryAction"
              >
                <FormattedMessage
                  id="xpack.streams.entityCentricLab.announcementBanner.revertLabel"
                  defaultMessage="Revert in Advanced Settings"
                />
              </EuiButtonEmpty>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const scenarioBannerText = (scenarioVariation: ScenarioVariation): string => {
  if (scenarioVariation === 'transition') {
    return i18n.translate('xpack.streams.entityCentricLab.announcementBanner.transitionText', {
      defaultMessage:
        'You\u2019ve successfully enabled the new infrastructure experience for all users on this deployment. It brings faster load times, hex map visualizations, and richer flyout context.',
    });
  }
  if (scenarioVariation === 'banner-admin') {
    return i18n.translate('xpack.streams.entityCentricLab.announcementBanner.adminText', {
      defaultMessage:
        'An admin on your team has enabled the new infrastructure experience. It brings faster load times, hex map visualizations, and richer flyout context.',
    });
  }
  return i18n.translate('xpack.streams.entityCentricLab.announcementBanner.userText', {
    defaultMessage:
      'Your team has enabled the new infrastructure experience. It brings faster load times, hex map visualizations, and richer flyout context.',
  });
};

export interface InfrastructureExperienceBannerProps {
  scenarioVariation: ScenarioVariation;
  canRevert: boolean;
  onTakeTour: () => void;
  onRevert: () => void;
  onDismiss: () => void;
}

export const InfrastructureExperienceBanner = ({
  scenarioVariation,
  canRevert,
  onTakeTour,
  onRevert,
  onDismiss,
}: InfrastructureExperienceBannerProps): JSX.Element => (
  <LabAnnouncementBanner
    title={i18n.translate('xpack.streams.entityCentricLab.announcementBanner.title', {
      defaultMessage: 'Your infrastructure view has been updated',
    })}
    text={scenarioBannerText(scenarioVariation)}
    onTakeTour={onTakeTour}
    onRevert={canRevert ? onRevert : undefined}
    onDismiss={onDismiss}
  />
);

const labTruncationCalloutStyles = ({ euiTheme }: UseEuiTheme) => ({
  callout: css`
    position: relative;
    display: flex;
    flex-grow: 0;
    max-inline-size: 100%;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.m} ${euiTheme.size.base};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
  `,
  icon: css`
    flex-shrink: 0;
    margin-block: ${euiTheme.size.xxs};
  `,
  content: css`
    min-inline-size: 0;
    max-inline-size: ${TEXT_MAX_WIDTH}px;

    .euiTitle {
      display: inline;
      margin-inline-end: ${euiTheme.size.xxs};
      font-weight: ${euiTheme.font.weight.bold};
      color: ${euiTheme.colors.textHeading};
    }

    .euiText {
      display: inline;
    }

    .euiText::before {
      content: '·';
      display: inline-block;
      inline-size: calc(${euiTheme.size.s} + ${euiTheme.size.xxs});
      text-align: center;
      color: ${euiTheme.colors.textHeading};
    }
  `,
});

/**
 * 10k truncation notice. Mirrors the current `EuiCallOut` warning at size `s`.
 */
export const LabTruncationCallout = (): JSX.Element => {
  const styles = useEuiMemoizedStyles(labTruncationCalloutStyles);
  const backgroundColorStyles = useEuiBackgroundColorCSS().warning;
  const borderColorStyles = useEuiBorderColorCSS().warning;

  return (
    <div
      css={[styles.callout, backgroundColorStyles, borderColorStyles]}
      data-test-subj="entityCentricLabTruncationCallout"
      role="note"
    >
      <span css={styles.icon}>
        <EuiIcon type="warning" color="warning" size="m" aria-hidden="true" />
      </span>
      <div css={styles.content}>
        <EuiTitle size="xxs">
          <p>
            <FormattedMessage
              id="xpack.streams.entityCentricLab.allEntities.truncationCalloutTitle"
              defaultMessage="10,000 entity limit"
            />
          </p>
        </EuiTitle>
        <EuiText size="s" component="span">
          <FormattedMessage
            id="xpack.streams.entityCentricLab.allEntities.truncationBanner"
            defaultMessage="We can only show 10,000 entities at a time. Use filters to slice and dice further your data."
          />
        </EuiText>
      </div>
    </div>
  );
};
