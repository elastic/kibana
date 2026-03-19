/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { matchPath, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { navCss } from './layouts/default';
import { useRouterNavigate } from '../common/lib/kibana';
import { PAGE_ROUTING_PATHS } from '../common/page_paths';
import { ManageIntegrationLink } from './manage_integration_link';
import { useKibana } from '../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';

enum Section {
  LiveQueries = 'live_queries',
  History = 'history',
  Packs = 'packs',
  SavedQueries = 'saved_queries',
}

const topBarCss = ({ euiTheme }: UseEuiTheme) => ({
  background: euiTheme.colors.body,
  borderBottom: euiTheme.border.thin,
  padding: `${euiTheme.size.s} ${euiTheme.size.l}`,
});

export const MainNavigation = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { notifications } = useKibana().services;
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  const isFeedbackEnabled = notifications?.feedback?.isEnabled() ?? true;
  const location = useLocation();
  const section = useMemo(() => {
    const firstSegment = location.pathname.split('/')[1] ?? 'overview';

    return isHistoryEnabled && firstSegment === 'new' ? Section.History : firstSegment;
  }, [location.pathname, isHistoryEnabled]);

  const isListView = useMemo(
    () =>
      [PAGE_ROUTING_PATHS.history, PAGE_ROUTING_PATHS.packs, PAGE_ROUTING_PATHS.saved_queries].some(
        (path) => matchPath(location.pathname, { path, exact: true })
      ),
    [location.pathname]
  );
  const feedbackButtonLabel = i18n.translate('xpack.osquery.appNavigation.giveFeedbackButton', {
    defaultMessage: 'Give feedback',
  });

  const historySection = isHistoryEnabled ? Section.History : Section.LiveQueries;
  const historyNavProps = useRouterNavigate(historySection);
  const packsNavProps = useRouterNavigate(Section.Packs);
  const savedQueriesNavProps = useRouterNavigate(Section.SavedQueries);
  const newQueryNavProps = useRouterNavigate('/new');

  const canRunQuery =
    permissions.writeLiveQueries ||
    (permissions.runSavedQueries && (permissions.readSavedQueries || permissions.readPacks));

  if (isHistoryEnabled) {
    const topBar = (
      <div css={topBarCss}>
        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" direction="row" alignItems="center">
              {isFeedbackEnabled && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    href="https://ela.st/osquery-feedback"
                    target="_blank"
                    aria-label={feedbackButtonLabel}
                    iconType="popout"
                    iconSide="right"
                    color="primary"
                    size="s"
                  >
                    {feedbackButtonLabel}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <ManageIntegrationLink />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );

    return (
      <>
        {topBar}
        {isListView && (
          <div css={navCss}>
            <EuiSpacer size="l" />
            <EuiFlexGroup gutterSize="l" alignItems="center">
              <EuiFlexItem>
                <EuiText>
                  <h1>
                    <FormattedMessage
                      id="xpack.osquery.appNavigation.title"
                      defaultMessage="Osquery"
                    />
                  </h1>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton fill {...newQueryNavProps} isDisabled={!canRunQuery}>
                  <FormattedMessage
                    id="xpack.osquery.history.newLiveQueryButtonLabel"
                    defaultMessage="Run query"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiTabs bottomBorder={false}>
              <EuiTab isSelected={section === historySection} {...historyNavProps}>
                <FormattedMessage
                  id="xpack.osquery.appNavigation.historyLinkText"
                  defaultMessage="History"
                />
              </EuiTab>
              <EuiTab isSelected={section === Section.Packs} {...packsNavProps}>
                <FormattedMessage
                  id="xpack.osquery.appNavigation.packsLinkText"
                  defaultMessage="Packs"
                />
              </EuiTab>
              <EuiTab isSelected={section === Section.SavedQueries} {...savedQueriesNavProps}>
                <FormattedMessage
                  id="xpack.osquery.appNavigation.queriesLinkText"
                  defaultMessage="Queries"
                />
              </EuiTab>
            </EuiTabs>
          </div>
        )}
      </>
    );
  }

  return (
    <div css={navCss}>
      <EuiFlexGroup gutterSize="l" alignItems="center">
        <EuiFlexItem>
          <EuiTabs bottomBorder={false}>
            <EuiTab isSelected={section === Section.LiveQueries} {...historyNavProps}>
              <FormattedMessage
                id="xpack.osquery.appNavigation.liveQueriesLinkText"
                defaultMessage="Live queries"
              />
            </EuiTab>
            <EuiTab isSelected={section === Section.Packs} {...packsNavProps}>
              <FormattedMessage
                id="xpack.osquery.appNavigation.packsLinkText"
                defaultMessage="Packs"
              />
            </EuiTab>
            <EuiTab isSelected={section === Section.SavedQueries} {...savedQueriesNavProps}>
              <FormattedMessage
                id="xpack.osquery.appNavigation.savedQueriesLinkText"
                defaultMessage="Saved queries"
              />
            </EuiTab>
          </EuiTabs>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" direction="row">
            {isFeedbackEnabled && (
              <EuiFlexItem>
                <EuiButtonEmpty
                  href="https://ela.st/osquery-feedback"
                  target="_blank"
                  aria-label={feedbackButtonLabel}
                  iconType="popout"
                  iconSide="right"
                  color="primary"
                >
                  {feedbackButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <ManageIntegrationLink />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
