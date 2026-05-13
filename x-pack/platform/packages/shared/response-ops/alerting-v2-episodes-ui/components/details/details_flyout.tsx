/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTab,
  EuiTabs,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AlertEpisodeDetailsHeaderSection } from './details_header_section';
import { AlertEpisodeOverviewSection } from './overview_section';
import { AlertEpisodesRelatedSection } from './related_section';
import { AlertEpisodeMetadataSection } from './metadata_section';
import type { AlertEpisodeMetadataSectionServices } from './metadata_section';
import { AlertEpisodeRunbookSection } from './runbook_section';
import * as i18n from './translations';

type TabId = 'overview' | 'related' | 'metadata' | 'runbook';

export interface AlertEpisodeDetailsFlyoutProps {
  episodeId: string;
  onClose: () => void;
  services: AlertEpisodeMetadataSectionServices;
  getEpisodeDetailsHref: (episodeId: string) => string;
  getRuleDetailsHref: (ruleId: string) => string;
}

export const AlertEpisodeDetailsFlyout = ({
  episodeId,
  onClose,
  services,
  getEpisodeDetailsHref,
  getRuleDetailsHref,
}: AlertEpisodeDetailsFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <EuiFlyout
      onClose={onClose}
      type="push"
      pushMinBreakpoint="m"
      data-test-subj="alertingV2EpisodeFlyout"
      size="35%"
      aria-label={i18n.FLYOUT_ARIA_LABEL}
    >
      <EuiFlyoutHeader hasBorder>
        <AlertEpisodeDetailsHeaderSection episodeId={episodeId} services={services} />
        <EuiTabs
          bottomBorder={false}
          css={css`
            margin-bottom: -${euiTheme.size.l};
          `}
        >
          <EuiTab
            isSelected={tab === 'overview'}
            onClick={() => setTab('overview')}
            data-test-subj="alertingV2EpisodeFlyoutTabOverview"
          >
            {i18n.FLYOUT_TAB_OVERVIEW}
          </EuiTab>
          <EuiTab
            isSelected={tab === 'related'}
            onClick={() => setTab('related')}
            data-test-subj="alertingV2EpisodeFlyoutTabRelated"
          >
            {i18n.FLYOUT_TAB_RELATED}
          </EuiTab>
          <EuiTab
            isSelected={tab === 'metadata'}
            onClick={() => setTab('metadata')}
            data-test-subj="alertingV2EpisodeFlyoutTabMetadata"
          >
            {i18n.FLYOUT_TAB_METADATA}
          </EuiTab>
          <EuiTab
            isSelected={tab === 'runbook'}
            onClick={() => setTab('runbook')}
            data-test-subj="alertingV2EpisodeFlyoutTabRunbook"
          >
            {i18n.FLYOUT_TAB_RUNBOOK}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        // The metadata tab should fill the body edge-to-edge with no flyout
        // padding, and the doc-viewer table inside takes the full available
        // height (its own internal scroll handles overflow). Other tabs use
        // the default flyout body padding/scroll.
        //
        // The doc-viewer table's search-input row and toggles row still get
        // horizontal padding so the controls don't sit flush against the
        // panel edge — same `:has()` selectors as the page, anchored on each
        // wrapper's stable direct child.
        css={
          tab === 'metadata'
            ? css`
                [class*='euiFlyoutBody__overflow']:not([class*='__overflowContent']) {
                  overflow: hidden;
                }
                [class*='euiFlyoutBody__overflowContent'] {
                  padding: 0;
                  block-size: 100%;
                  display: flex;
                  flex-direction: column;
                }
                [class*='euiFlexItem']:has(
                    > [class*='euiFormControlLayout']
                      [data-test-subj='unifiedDocViewerFieldsSearchInput']
                  ),
                [class*='euiFlexItem']:has(
                    > [class*='euiFlexGroup'] > [class*='euiFlexItem'] > [class*='euiSwitch']
                  ) {
                  padding-inline: ${euiTheme.size.m};
                }
              `
            : undefined
        }
      >
        {tab === 'overview' && (
          <AlertEpisodeOverviewSection
            episodeId={episodeId}
            services={services}
            getRuleDetailsHref={getRuleDetailsHref}
          />
        )}
        {tab === 'related' && (
          <AlertEpisodesRelatedSection
            episodeId={episodeId}
            services={services}
            getEpisodeDetailsHref={getEpisodeDetailsHref}
            showHeading={false}
            flush
          />
        )}
        {tab === 'metadata' && (
          <AlertEpisodeMetadataSection
            episodeId={episodeId}
            services={services}
            // The doc-viewer table sizes its internal scroll against
            // `window.innerHeight`, which doesn't account for the flyout
            // footer. Subtract the footer's approximate height (button +
            // top/bottom padding for the default `paddingSize="l"`) so the
            // table fits above the footer instead of extending past it.
            decreaseAvailableHeightBy={80}
          />
        )}
        {tab === 'runbook' && (
          <AlertEpisodeRunbookSection episodeId={episodeId} services={services} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onClose}
              data-test-subj="alertingV2EpisodeFlyoutCloseButton"
              flush="left"
            >
              {i18n.FLYOUT_CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              href={getEpisodeDetailsHref(episodeId)}
              data-test-subj="alertingV2EpisodeFlyoutViewDetailsButton"
              iconType="eye"
            >
              {i18n.FLYOUT_VIEW_DETAILS}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
