/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import type { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
import { flatten } from 'lodash';
import { isDefined } from '@kbn/ml-is-defined';
import type { ResultLinks } from '../../../../../common/app';
import type { LinkCardProps } from '../link_card/link_card';
import { useDataVisualizerKibana } from '../../../kibana_context';
import type { CombinedField } from '../combined_fields/types';

type LinkType = 'file' | 'index';

export interface GetAdditionalLinksParams {
  dataViewId: string;
  dataViewTitle?: string;
  globalState?: any;
}

export type GetAdditionalLinks = Array<
  (params: GetAdditionalLinksParams) => Promise<ResultLink[] | undefined>
>;

export interface ResultLink {
  id: string;
  type: LinkType;
  title: string;
  icon: string;
  description: string;
  getUrl(params?: any): Promise<string>;
  canDisplay(params?: any): Promise<boolean>;
  'data-test-subj'?: string;
}

interface Props {
  results: FindFileStructureResponse;
  index: string;
  dataViewId: string;
  timeFieldName?: string;
  createDataView: boolean;
  showFilebeatFlyout(): void;
  getAdditionalLinks?: GetAdditionalLinks;
  resultLinks?: ResultLinks;
  combinedFields: CombinedField[];
}

interface GlobalState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
}

const RECHECK_DELAY_MS = 3000;

export const ResultsLinks: FC<Props> = ({
  results,
  index,
  dataViewId,
  timeFieldName,
  createDataView,
  showFilebeatFlyout,
  getAdditionalLinks,
  resultLinks,
  combinedFields,
}) => {
  const {
    services: {
      fileUpload,
      share: { url },
      application: { getUrlForApp, capabilities },
    },
  } = useDataVisualizerKibana();
  const fieldStats = results.field_stats;
  const [duration, setDuration] = useState({
    from: 'now-30m',
    to: 'now',
  });
  const [globalState, setGlobalState] = useState<GlobalState | undefined>();

  const [discoverLink, setDiscoverLink] = useState('');
  const [indexManagementLink, setIndexManagementLink] = useState('');
  const [dataViewsManagementLink, setDataViewsManagementLink] = useState('');
  const [playgroundLink, setPlaygroundLink] = useState('');
  const [asyncHrefCards, setAsyncHrefCards] = useState<LinkCardProps[]>();

  useEffect(() => {
    let unmounted = false;

    const getDiscoverUrl = async (): Promise<void> => {
      const isDiscoverAvailable = capabilities.discover_v2?.show ?? false;
      if (!isDiscoverAvailable) return;
      const discoverLocator = url.locators.get('DISCOVER_APP_LOCATOR');

      if (!discoverLocator) {
        // eslint-disable-next-line no-console
        console.error('Discover locator not available');
        return;
      }
      const discoverUrl = await discoverLocator.getUrl({
        indexPatternId: dataViewId,
        timeRange: globalState?.time ? globalState.time : undefined,
      });
      if (unmounted) return;
      setDiscoverLink(discoverUrl);
    };

    getDiscoverUrl();

    if (Array.isArray(getAdditionalLinks)) {
      Promise.all(
        getAdditionalLinks.map(async (asyncCardGetter) => {
          const cardResults = await asyncCardGetter({
            dataViewId,
            globalState,
          });
          if (Array.isArray(cardResults)) {
            return await Promise.all(
              cardResults.map(async (c) => ({
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

    if (!unmounted) {
      const playgroundLocator = url.locators.get('PLAYGROUND_LOCATOR_ID');

      if (playgroundLocator !== undefined) {
        playgroundLocator.getUrl({ 'default-index': index }).then(setPlaygroundLink);
      }

      setIndexManagementLink(
        getUrlForApp('management', { path: '/data/index_management/indices' })
      );

      if (capabilities.indexPatterns.save === true) {
        setDataViewsManagementLink(
          getUrlForApp('management', {
            path: `/kibana/dataViews${createDataView ? `/dataView/${dataViewId}` : ''}`,
          })
        );
      }
    }

    return () => {
      unmounted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, url, JSON.stringify(globalState)]);

  useEffect(() => {
    updateTimeValues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const _globalState: GlobalState = {
      time: {
        from: duration.from,
        to: duration.to,
      },
    };
    setGlobalState(_globalState);
  }, [duration]);

  useEffect(() => {
    // Update the global time range from known timeFieldName if stats is available
    if (
      fieldStats &&
      typeof fieldStats === 'object' &&
      timeFieldName !== undefined &&
      Object.hasOwn(fieldStats, timeFieldName) &&
      fieldStats[timeFieldName].earliest !== undefined &&
      fieldStats[timeFieldName].latest !== undefined
    ) {
      setGlobalState({
        time: { from: fieldStats[timeFieldName].earliest!, to: fieldStats[timeFieldName].latest! },
      });
    }
  }, [timeFieldName, fieldStats]);

  async function updateTimeValues(recheck = true) {
    if (timeFieldName !== undefined) {
      const { from, to } = await getFullTimeRange(index, timeFieldName, fileUpload);
      setDuration({
        from: from === null ? duration.from : from,
        to: to === null ? duration.to : to,
      });

      // these links may have been drawn too quickly for the index to be ready
      // to give us the correct start and end times.
      // especially if the data was small.
      // so if the start and end were null, try again in 3s
      if (recheck && (from === null || to === null)) {
        setTimeout(() => {
          updateTimeValues(false);
        }, RECHECK_DELAY_MS);
      }
    }
  }

  return (
    <EuiFlexGroup gutterSize="l">
      {createDataView && discoverLink && (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            icon={<EuiIcon size="xxl" type={`discoverApp`} />}
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.file.resultsLinks.viewIndexInDiscoverTitle"
                defaultMessage="View index in Discover"
              />
            }
            description=""
            href={discoverLink}
          />
        </EuiFlexItem>
      )}
      {indexManagementLink && (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.file.resultsLinks.indexManagementTitle"
                defaultMessage="Index Management"
              />
            }
            description=""
            href={indexManagementLink}
          />
        </EuiFlexItem>
      )}
      {dataViewsManagementLink && (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            icon={<EuiIcon size="xxl" type={`managementApp`} />}
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.file.resultsLinks.dataViewManagementTitle"
                defaultMessage="Data View Management"
              />
            }
            description=""
            href={dataViewsManagementLink}
          />
        </EuiFlexItem>
      )}
      {resultLinks?.fileBeat?.enabled === false ? null : (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            icon={<EuiIcon size="xxl" type={`filebeatApp`} />}
            data-test-subj="fileDataVisFilebeatConfigLink"
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.file.resultsLinks.fileBeatConfig"
                defaultMessage="Create Filebeat configuration"
              />
            }
            description=""
            onClick={showFilebeatFlyout}
          />
        </EuiFlexItem>
      )}

      {playgroundLink ? (
        <EuiFlexItem>
          <EuiCard
            hasBorder
            icon={<EuiIcon size="xxl" type={`logoEnterpriseSearch`} />}
            data-test-subj="fileDataVisFilebeatConfigLink"
            title={
              <FormattedMessage
                id="xpack.dataVisualizer.file.resultsLinks.playground"
                defaultMessage="Playground"
              />
            }
            description=""
            href={playgroundLink}
          />
        </EuiFlexItem>
      ) : null}

      {Array.isArray(asyncHrefCards) &&
        asyncHrefCards.map((link) => (
          <EuiFlexItem key={link.title}>
            <EuiCard
              hasBorder
              icon={<EuiIcon size="xxl" type={link.icon} />}
              data-test-subj="fileDataVisLink"
              title={link.title}
              description={link.description}
              href={link.href}
            />
          </EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
};

async function getFullTimeRange(
  index: string,
  timeFieldName: string,
  { getTimeFieldRange }: FileUploadPluginStart
) {
  const query = { bool: { must: [{ query_string: { analyze_wildcard: true, query: '*' } }] } };
  const resp = await getTimeFieldRange(index, query, timeFieldName);

  return {
    from: moment(resp.start.epoch).toISOString(),
    to: moment(resp.end.epoch).toISOString(),
  };
}
