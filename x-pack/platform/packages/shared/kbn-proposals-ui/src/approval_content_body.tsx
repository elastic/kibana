/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  getDefaultEuiMarkdownProcessingPlugins,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import type { IBasePath } from '@kbn/core-http-browser';
import type { ApprovalOutcomeBanner } from './approval_outcome';
import { createMarkdownLink } from './markdown_link';

interface ApprovalContentBodyProps {
  /** Hidden while `'declining'`: `DeclineReasonForm` takes this space instead. */
  mode: 'view' | 'declining';
  /** The proposal's own markdown. Omitted entirely renders no comment block at all. */
  comment?: string;
  /** `undefined` for a still-pending decision, which has no outcome to report yet. */
  banner?: ApprovalOutcomeBanner;
  /** Appended to the banner title after a ` • `, e.g. a decline's reason. */
  bannerSuffix?: React.ReactNode;
  /** A rejected `primaryAction`/`onDismiss` call, surfaced here rather than thrown away. */
  actionError?: string;
  /** See `ApprovalContentProps.basePath`. */
  basePath?: IBasePath;
  'data-test-subj'?: string;
}

/**
 * EUI's default processing plugins with the `a` component swapped for one that resolves in-app
 * links against `basePath`. Built per base path: the default list is a module-level singleton,
 * and `getDefaultEuiMarkdownProcessingPlugins` returns a fresh copy each call, so this never
 * mutates anything shared with other markdown on the page.
 */
const buildProcessingPluginList = (basePath?: IBasePath) => {
  const plugins = getDefaultEuiMarkdownProcessingPlugins({ linkProps: { target: '_blank' } });
  // The rehype-react plugin sits at index 1; its options carry the component map.
  plugins[1][1].components.a = createMarkdownLink(basePath);
  return plugins;
};

const bannerIconFor = (color: 'success' | 'primary' | 'danger'): IconType =>
  color === 'success' ? 'check' : color === 'danger' ? 'warning' : 'clock';

/**
 * The scrollable middle of `ApprovalContent`: the proposal's comment, its outcome banner once
 * decided or deciding, and a transient action error. Grouped into one scrolling region so the
 * header and footer stay put while a long comment scrolls, and the modal never grows past the
 * viewport.
 */
export const ApprovalContentBody = memo<ApprovalContentBodyProps>(
  ({
    mode,
    comment,
    banner,
    bannerSuffix,
    actionError,
    basePath,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const processingPluginList = useMemo(() => buildProcessingPluginList(basePath), [basePath]);

    return (
      <div
        css={css({
          padding: `0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base}`,
          maxBlockSize: '50vh',
          overflowY: 'auto',
        })}
      >
        {/* A comment is as long as the worker made it, so the body scrolls and the footer stays
            reachable without the modal growing past the viewport. Hidden while declining: the
            reason form below takes its place rather than sitting alongside it. */}
        {mode === 'view' && comment !== undefined && (
          <div css={css({ marginBottom: euiTheme.size.m })}>
            <EuiMarkdownFormat
              textSize="s"
              processingPluginList={processingPluginList}
              data-test-subj={dataTestSubj ? `${dataTestSubj}-comment` : undefined}
            >
              {comment}
            </EuiMarkdownFormat>
          </div>
        )}

        {banner && (
          // eslint-disable-next-line @kbn/kbn-ui/prefer_kbn_ui_callout
          <EuiCallOut
            announceOnMount
            size="s"
            color={banner.color}
            iconType={banner.isLoading ? EuiLoadingSpinner : bannerIconFor(banner.color)}
            title={
              // The reason suffix reads as detail, not part of the state word itself — the
              // callout's own title styling would otherwise bold all of it.
              bannerSuffix ? (
                <>
                  {banner.title}
                  <span css={css({ fontWeight: euiTheme.font.weight.regular })}>
                    {' • '}
                    {bannerSuffix}
                  </span>
                </>
              ) : (
                banner.title
              )
            }
            data-test-subj={dataTestSubj ? `${dataTestSubj}-outcome` : undefined}
          />
        )}

        {actionError && (
          <>
            <div css={css({ marginTop: euiTheme.size.s })} />
            {/* eslint-disable-next-line @kbn/kbn-ui/prefer_kbn_ui_callout */}
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              title={actionError}
              data-test-subj={dataTestSubj ? `${dataTestSubj}-error` : undefined}
            />
          </>
        )}
      </div>
    );
  }
);

ApprovalContentBody.displayName = 'ApprovalContentBody';
