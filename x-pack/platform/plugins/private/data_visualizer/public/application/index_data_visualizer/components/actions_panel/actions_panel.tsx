/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { flatten } from 'lodash';
import type { FC } from 'react';
import React, { Fragment, useState, useEffect } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useEuiBreakpoint, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useUrlState } from '@kbn/ml-url-state';
import { isDefined } from '@kbn/ml-is-defined';

import type { LinkCardProps } from '../../../common/components/link_card/link_card';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { LinkCard } from '../../../common/components/link_card';
import type { GetAdditionalLinks } from '../../../common/components/results_links';

interface Props {
  dataView: DataView;
  searchString?: string | { [key: string]: any };
  searchQueryLanguage?: string;
  getAdditionalLinks?: GetAdditionalLinks;
}

const ACTIONS_PANEL_WIDTH = '240px';

export const ActionsPanel: FC<Props> = ({
  dataView,
  searchString,
  searchQueryLanguage,
  getAdditionalLinks,
}) => {
  const [globalState] = useUrlState('_g');

  const [discoverLink, setDiscoverLink] = useState('');
  const [asyncHrefCards, setAsyncHrefCards] = useState<LinkCardProps[]>();

  const {
    services: {
      data,
      application: { capabilities },
      share: { url },
    },
  } = useDataVisualizerKibana();

  useEffect(() => {
    let unmounted = false;

    const dataViewId = dataView.id;
    const dataViewIndexPattern = dataView.getIndexPattern();
    const getDiscoverUrl = async (): Promise<void> => {
      const isDiscoverAvailable = capabilities.discover_v2?.show ?? false;
      if (!isDiscoverAvailable) return;
      const discoverLocator = url?.locators.get('DISCOVER_APP_LOCATOR');

      if (!discoverLocator) {
        // eslint-disable-next-line no-console
        console.error('Discover locator not available');
        return;
      }
      const discoverUrl = await discoverLocator.getUrl({
        indexPatternId: dataViewId,
        filters: data.query.filterManager.getFilters() ?? [],
        query:
          searchString && searchQueryLanguage !== undefined
            ? { query: searchString, language: searchQueryLanguage }
            : undefined,
        timeRange: globalState?.time ? globalState.time : undefined,
        refreshInterval: globalState?.refreshInterval ? globalState.refreshInterval : undefined,
      });
      if (unmounted) return;
      setDiscoverLink(discoverUrl);
    };

    if (Array.isArray(getAdditionalLinks) && dataViewId !== undefined) {
      Promise.all(
        getAdditionalLinks.map(async (asyncCardGetter) => {
          const results = await asyncCardGetter({
            dataViewId,
            dataViewTitle: dataViewIndexPattern,
          });
          if (Array.isArray(results)) {
            return await Promise.all(
              results.map(async (c) => ({
                ...c,
                canDisplay: await c.canDisplay(),
                href: await c.getUrl(),
              }))
            );
          }
        })
      ).then((cards) => {
        setAsyncHrefCards(
          flatten(cards)
            .filter(isDefined)
            .filter((d) => d.canDisplay === true)
        );
      });
    }
    getDiscoverUrl();

    return () => {
      unmounted = true;
    };
  }, [
    dataView,
    searchString,
    searchQueryLanguage,
    globalState,
    capabilities,
    url,
    data.query,
    getAdditionalLinks,
  ]);
  const showActionsPanel =
    discoverLink || (Array.isArray(asyncHrefCards) && asyncHrefCards.length > 0);

  const dvActionsPanel = css({
    [useEuiBreakpoint(['xl', 'xxl'])]: {
      width: ACTIONS_PANEL_WIDTH,
    },
    width: '100%',
  });
  // Note we use display:none for the DataRecognizer section as it needs to be
  // passed the recognizerResults object, and then run the recognizer check which
  // controls whether the recognizer section is ultimately displayed.
  return showActionsPanel ? (
    <div data-test-subj="dataVisualizerActionsPanel" css={dvActionsPanel}>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.dataVisualizer.index.actionsPanel.exploreTitle"
            defaultMessage="Explore your data"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {discoverLink && (
        <>
          <LinkCard
            href={discoverLink}
            icon="discoverApp"
            description={i18n.translate(
              'xpack.dataVisualizer.index.actionsPanel.viewIndexInDiscoverDescription',
              {
                defaultMessage: 'Explore the documents in your index.',
              }
            )}
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.index.actionsPanel.discoverAppTitle"
                defaultMessage="Discover"
              />
            }
            data-test-subj="dataVisualizerViewInDiscoverCard"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {Array.isArray(asyncHrefCards) &&
        asyncHrefCards.map((link) => (
          <Fragment key={`dv-action-card-${link.title}`}>
            <LinkCard
              href={link.href}
              icon={link.icon}
              description={link.description}
              title={link.title}
              data-test-subj={link['data-test-subj']}
              key={link.href}
            />
            <EuiSpacer size="m" />
          </Fragment>
        ))}
    </div>
  ) : null;
};
