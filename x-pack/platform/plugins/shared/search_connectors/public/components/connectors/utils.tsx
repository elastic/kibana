/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const getConnectedBadgeAriaLabel = (connectedCount: number) =>
  i18n.translate('xpack.searchConnectorstats.connectedBadgeAriaLabel', {
    defaultMessage: '{number} Connected connectors',
    values: {
      number: connectedCount,
    },
  });
export const getConnectedConnectorsBadgeLabel = (connectedCount: number) => (
  <FormattedMessage
    id="xpack.searchConnectors.connectorStats.connectedBadgeLabel"
    defaultMessage="{number} Connected"
    values={{
      number: connectedCount,
    }}
  />
);
export const getConnectedConnectorsTooltipContent = (
  connectedCount: number,
  isCrawler: boolean
) => (
  <EuiText size="xs">
    {!isCrawler ? (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.connectedTooltip"
        defaultMessage="{connectedCount} {completeConnectorsText} - Number of connectors successfully configured and connected in the last 30 minutes."
        values={{
          completeConnectorsText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.connectorTooltipConnected', {
                defaultMessage: `Connected connectors`,
              })}
            </b>
          ),
          connectedCount: <b>{connectedCount}</b>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.connectedCrawlerTooltip"
        defaultMessage="{connectedCount} {completeConnectorsText} - Number of crawlers that are configured and connected."
        values={{
          completeConnectorsText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.crawlerTooltipConnected', {
                defaultMessage: `Connected crawlers`,
              })}
            </b>
          ),
          connectedCount: <b>{connectedCount}</b>,
        }}
      />
    )}
  </EuiText>
);
export const getIncompleteConnectorsTooltip = (incompleteCount: number, isCrawler: boolean) => (
  <EuiText size="xs">
    {!isCrawler ? (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.incompleteTooltip"
        defaultMessage="{incompleteCount} {incompleteConnectorsText} - Number of connectors whose configuration is incomplete. Syncs won't be possible until the connector is fully configured and running."
        values={{
          incompleteConnectorsText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.incompleteTooltipConnected', {
                defaultMessage: `Incomplete connectors`,
              })}
            </b>
          ),
          incompleteCount: <b>{incompleteCount}</b>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.incompleteCrawlerTooltip"
        defaultMessage="{incompleteCount} {incompleteConnectorsText} - Number of crawlers whose configuration is incomplete. These crawlers are not ready to crawl."
        values={{
          incompleteConnectorsText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.incompleteTooltipCrawler', {
                defaultMessage: `Incomplete crawlers`,
              })}
            </b>
          ),
          incompleteCount: <b>{incompleteCount}</b>,
        }}
      />
    )}
  </EuiText>
);
export const getIncompleteConnectorsBadgeLabel = (incompleteCount: number) => (
  <FormattedMessage
    id="xpack.searchConnectors.connectorStats.incompleteBadgeLabel"
    defaultMessage="{incompleteCount} Incomplete"
    values={{
      incompleteCount,
    }}
  />
);
export const getIncompleteConnectorBadgeAriaLabel = (incompleteCount: number) =>
  i18n.translate('xpack.searchConnectorstats.incompleteBadgeAriaLabel', {
    defaultMessage: '{incompleteCount} Incomplete connectors',
    values: {
      incompleteCount,
    },
  });
export const getRunningJobsLabel = (inProgressCount: number, isCrawler: boolean) =>
  !isCrawler
    ? i18n.translate('xpack.searchConnectorstats.runningSyncsTextLabel', {
        defaultMessage: '{syncs} running syncs',
        values: {
          syncs: inProgressCount,
        },
      })
    : i18n.translate('xpack.searchConnectorstats.runningCrawlsTextLabel', {
        defaultMessage: '{syncs} running crawls',
        values: {
          syncs: inProgressCount,
        },
      });
export const getRunningJobsTooltip = (inProgressCount: number, isCrawler: boolean) => (
  <EuiText size="xs">
    {!isCrawler ? (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.runningTooltip"
        defaultMessage="{inProgressCount} {runningCountText} - Number of running sync jobs. This includes idle syncs."
        values={{
          inProgressCount: <b>{inProgressCount}</b>,
          runningCountText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.connectorTooltipRunning', {
                defaultMessage: `Running syncs`,
              })}
            </b>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.runningCrawlerTooltip"
        defaultMessage="{inProgressCount} {runningCountText} - Number of running crawls"
        values={{
          inProgressCount: <b>{inProgressCount}</b>,
          runningCountText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.crawlerTooltipRunning', {
                defaultMessage: `Running crawls`,
              })}
            </b>
          ),
        }}
      />
    )}
  </EuiText>
);
export const getRunningJobsBadgeAriaLabel = (inProgressCount: number, isCrawler: boolean) =>
  !isCrawler
    ? i18n.translate('xpack.searchConnectorstats.runningBadgeAriaLabel', {
        defaultMessage: '{number} Running syncs.',
        values: {
          number: inProgressCount,
        },
      })
    : i18n.translate('xpack.searchConnectorstats.runningCrawlerBadgeAriaLabel', {
        defaultMessage: '{number} Running crawls.',
        values: {
          number: inProgressCount,
        },
      });
export const getRunningJobsBadgeLabel = (inProgressCount: number, isCrawler: boolean) =>
  !isCrawler
    ? i18n.translate('xpack.searchConnectorstats.runningBadgeLabel', {
        defaultMessage: '{number} Running syncs',
        values: {
          number: inProgressCount,
        },
      })
    : i18n.translate('xpack.searchConnectorstats.runningCrawlerBadgeLabel', {
        defaultMessage: '{number} Running crawls',
        values: {
          number: inProgressCount,
        },
      });
export const getIdleJobsLabel = (idleCount: number) =>
  i18n.translate('xpack.searchConnectorstats.idleJobsText', {
    defaultMessage: '{idleCount} Idle syncs',
    values: {
      idleCount,
    },
  });
export const getIdleJobsTooltip = (idleCount: number) => (
  <EuiText size="xs">
    <FormattedMessage
      id="xpack.searchConnectors.connectorStats.idleTooltip"
      defaultMessage="{idleCount} {idleCountText} - Number of sync jobs which are still running but have not seen any update from the backend connector for more than 1 minute"
      values={{
        idleCount: <b>{idleCount}</b>,
        idleCountText: (
          <b>
            {i18n.translate('xpack.searchConnectorstats.connectorTooltipIdle', {
              defaultMessage: `Idle syncs`,
            })}
          </b>
        ),
      }}
    />
  </EuiText>
);
export const getOrphanedJobsTooltip = (orphanedCount: number, isCrawler: boolean) => (
  <EuiText size="xs">
    {!isCrawler ? (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.orphanedTooltip"
        defaultMessage="{orphanedCount} {orphanedCountText} - Number of sync jobs whose associated connector can't be found. The connector might have been deleted."
        values={{
          orphanedCount: <b>{orphanedCount}</b>,
          orphanedCountText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.connectorTooltipOrphaned', {
                defaultMessage: `Orphaned syncs`,
              })}
            </b>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.orphanedCrawlerTooltip"
        defaultMessage="{orphanedCount} {orphanedCountText} - Number of crawl jobs whose associated crawler can't be found. The crawler might have been deleted."
        values={{
          orphanedCount: <b>{orphanedCount}</b>,
          orphanedCountText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.crawlerTooltipOrphaned', {
                defaultMessage: `Orphaned crawls`,
              })}
            </b>
          ),
        }}
      />
    )}
  </EuiText>
);
export const getOrphanedJobsLabel = (orphanedCount: number, isCrawler: boolean) =>
  !isCrawler
    ? i18n.translate('xpack.searchConnectorstats.orphanedBadgeAriaLabel', {
        defaultMessage: '{number} Orphaned syncs.',
        values: {
          number: orphanedCount,
        },
      })
    : i18n.translate('xpack.searchConnectorstats.orphanedCrawlerBadgeAriaLabel', {
        defaultMessage: '{number} Orphaned crawls.',
        values: {
          number: orphanedCount,
        },
      });
export const getSyncJobErrorsTooltip = (errorCount: number, isCrawler: boolean) => (
  <EuiText size="xs">
    {!isCrawler ? (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.errorTooltip"
        defaultMessage="{errorCount} {errorCountText} - Number of connectors whose last full sync failed"
        values={{
          errorCount: <b>{errorCount}</b>,
          errorCountText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.connectorTooltipError', {
                defaultMessage: `Sync errors`,
              })}
            </b>
          ),
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.searchConnectors.connectorStats.errorCrawlerTooltip"
        defaultMessage="{errorCount} {errorCountText} - Number of crawlers whose last crawl failed"
        values={{
          errorCount: <b>{errorCount}</b>,
          errorCountText: (
            <b>
              {i18n.translate('xpack.searchConnectorstats.crawlerTooltipError', {
                defaultMessage: `Crawl errors`,
              })}
            </b>
          ),
        }}
      />
    )}
  </EuiText>
);
export const getSyncJobErrorsLabel = (errorCount: number, isCrawler: boolean) =>
  !isCrawler
    ? i18n.translate('xpack.searchConnectorstats.errorBadgeLabel', {
        defaultMessage: '{number} Sync errors',
        values: {
          number: errorCount,
        },
      })
    : i18n.translate('xpack.searchConnectorstats.errorCrawlerBadgeLabel', {
        defaultMessage: '{number} Crawl errors',
        values: {
          number: errorCount,
        },
      });

interface EuiBasicTableOnChange {
  page: { index: number };
}
export const handlePageChange =
  (paginationCallback: Function) =>
  ({ page: { index } }: EuiBasicTableOnChange) => {
    paginationCallback(index + 1);
  };
