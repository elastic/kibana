/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  getDefaultEuiMarkdownProcessingPlugins,
  useEuiTheme,
} from '@elastic/eui';
import type { ApprovalOutcomeBanner } from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { InlineCalloutTitle } from './inline_callout_title';

interface ApprovalContentBodyProps {
  /** Hidden while `'declining'`: `DeclineReasonForm` takes this space instead. */
  mode: 'view' | 'declining';
  /** The proposal's own markdown. Omitted entirely renders no comment block at all. */
  comment?: string;
  /** `undefined` for a still-pending decision, which has no outcome to report yet. */
  banner?: ApprovalOutcomeBanner;
  /** Why the outcome is what it is: the banner's description, after the title. */
  bannerReason?: React.ReactNode;
  /** A rejected `primaryAction`/`onDismiss` call, surfaced here rather than thrown away. */
  actionError?: string;
  'data-test-subj'?: string;
}

const processingPluginList = getDefaultEuiMarkdownProcessingPlugins({
  linkProps: { target: '_blank' },
});

/**
 * The scrollable middle of `ApprovalContent`: the proposal's comment, its outcome banner once
 * decided or deciding, and a transient action error. Grouped into one scrolling region so the
 * header and footer stay put while a long comment scrolls, and the modal never grows past the
 * viewport.
 */
export const ApprovalContentBody = memo<ApprovalContentBodyProps>(
  ({ mode, comment, banner, bannerReason, actionError, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();

    // Nothing to show (declining, with no banner or error): no empty padded box between the
    // header and the reason form.
    const hasContent = (mode === 'view' && comment !== undefined) || banner || actionError;
    if (!hasContent) {
      return null;
    }

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
            // The loader is the one custom icon; every other state keeps EUI's own icon for its colour.
            iconType={banner.isLoading ? EuiLoadingSpinner : undefined}
            title={<InlineCalloutTitle title={banner.title} description={bannerReason} />}
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
              title={
                <InlineCalloutTitle
                  title={APPROVAL_MODAL_TRANSLATIONS.failedBannerTitle}
                  description={actionError}
                />
              }
              data-test-subj={dataTestSubj ? `${dataTestSubj}-error` : undefined}
            />
          </>
        )}
      </div>
    );
  }
);

ApprovalContentBody.displayName = 'ApprovalContentBody';
