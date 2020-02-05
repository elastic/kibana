/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { AppMountContext } from 'kibana/public';
import { pick, isEmpty } from 'lodash';
import url from 'url';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { getDiscoveryHref } from '../Links/DiscoverLinks/DiscoverLink';
import { getDiscoverQuery } from '../Links/DiscoverLinks/DiscoverTransactionLink';
import { getInfraHref } from '../Links/InfraLink';
import { fromQuery } from '../Links/url_helpers';

function getInfraMetricsQuery(transaction: Transaction) {
  const plus5 = new Date(transaction['@timestamp']);
  const minus5 = new Date(plus5.getTime());

  plus5.setMinutes(plus5.getMinutes() + 5);
  minus5.setMinutes(minus5.getMinutes() - 5);

  return {
    from: minus5.getTime(),
    to: plus5.getTime()
  };
}

interface Action {
  key: string;
  label: string;
  href: string;
  condition: boolean;
}

interface SectionItem {
  key: string;
  title?: string;
  subtitle?: string;
  actions: Action[];
}

interface Section {
  [key: string]: SectionItem[];
}

export const getSections = (
  transaction: Transaction,
  basePath: AppMountContext['core']['http']['basePath'],
  location: Location,
  urlParams: IUrlParams
) => {
  const hostName = transaction.host?.hostname;
  const podId = transaction.kubernetes?.pod.uid;
  const containerId = transaction.container?.id;

  const time = Math.round(transaction.timestamp.us / 1000);
  const infraMetricsQuery = getInfraMetricsQuery(transaction);

  const uptimeLink = url.format({
    pathname: basePath.prepend('/app/uptime'),
    hash: `/?${fromQuery(
      pick(
        {
          dateRangeStart: urlParams.rangeFrom,
          dateRangeEnd: urlParams.rangeTo,
          search: `url.domain:"${transaction.url?.domain}"`
        },
        (val: string) => !isEmpty(val)
      )
    )}`
  });

  const podActions: Action[] = [
    {
      key: 'podLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showPodLogsLinkLabel',
        { defaultMessage: 'Pod logs' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/pod-logs/${podId}`,
        query: { time }
      }),
      condition: !!podId
    },
    {
      key: 'podMetrics',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showPodMetricsLinkLabel',
        { defaultMessage: 'Pod metrics' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/pod-detail/${podId}`,
        query: infraMetricsQuery
      }),
      condition: !!podId
    }
  ];

  const containerActions: Action[] = [
    {
      key: 'containerLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showContainerLogsLinkLabel',
        { defaultMessage: 'Container logs' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/container-logs/${containerId}`,
        query: { time }
      }),
      condition: !!containerId
    },
    {
      key: 'containerMetrics',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showContainerMetricsLinkLabel',
        { defaultMessage: 'Container metrics' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/container-detail/${containerId}`,
        query: infraMetricsQuery
      }),
      condition: !!containerId
    }
  ];

  const hostActions: Action[] = [
    {
      key: 'hostLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostLogsLinkLabel',
        { defaultMessage: 'Host logs' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/host-logs/${hostName}`,
        query: { time }
      }),
      condition: !!hostName
    },
    {
      key: 'hostMetrics',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostMetricsLinkLabel',
        { defaultMessage: 'Host metrics' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/host-detail/${hostName}`,
        query: infraMetricsQuery
      }),
      condition: !!hostName
    }
  ];

  const traceActions: Action[] = [
    {
      key: 'traceLogs',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showTraceLogsLinkLabel',
        { defaultMessage: 'Trace logs' }
      ),
      href: getInfraHref({
        basePath,
        path: `/link-to/logs`,
        query: {
          time,
          filter: `trace.id:"${transaction.trace.id}" OR ${transaction.trace.id}`
        }
      }),
      condition: true
    }
  ];

  const kibanaActions: Action[] = [
    {
      key: 'sampleDocument',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.viewSampleDocumentLinkLabel',
        {
          defaultMessage: 'View sample document'
        }
      ),
      href: getDiscoveryHref({
        basePath,
        query: getDiscoverQuery(transaction),
        location
      }),
      condition: true
    },
    {
      key: 'monitorStatus',
      label: i18n.translate('xpack.apm.transactionActionMenu.viewInUptime', {
        defaultMessage: 'View monitor status'
      }),
      href: uptimeLink,
      condition: !!transaction.url?.domain
    }
  ];

  const sections: Section = {
    observability: [
      {
        key: 'podDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.pod.title', {
          defaultMessage: 'Pod details'
        }),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.pod.subtitle',
          {
            defaultMessage:
              'View logs and metrics of this pod to get further details.'
          }
        ),
        actions: podActions
      },
      {
        key: 'containerDetails',
        title: i18n.translate(
          'xpack.apm.transactionActionMenu.container.title',
          {
            defaultMessage: 'Container details'
          }
        ),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.container.subtitle',
          {
            defaultMessage:
              'View logs and metrics of this container to get further details.'
          }
        ),
        actions: containerActions
      },
      {
        key: 'hostDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.host.title', {
          defaultMessage: 'Host details'
        }),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.host.subtitle',
          {
            defaultMessage: 'View host logs to get further details.'
          }
        ),
        actions: hostActions
      },
      {
        key: 'traceDetails',
        title: i18n.translate('xpack.apm.transactionActionMenu.trace.title', {
          defaultMessage: 'Trace details'
        }),
        subtitle: i18n.translate(
          'xpack.apm.transactionActionMenu.trace.subtitle',
          {
            defaultMessage: 'View the trace logs to get further details.'
          }
        ),
        actions: traceActions
      }
    ],
    kibana: [{ key: 'kibana', actions: kibanaActions }]
  };

  // Filter out actions that shouldnt be shown and sections without any actions.
  return Object.values(sections).map(items =>
    items
      .reduce((acc: SectionItem[], curr: SectionItem) => {
        const actions = curr.actions.filter(
          (action: Action) => action.condition
        );
        acc.push({ ...curr, actions });
        return acc;
      }, [])
      .filter(section => section.actions.length > 0)
  );
};
