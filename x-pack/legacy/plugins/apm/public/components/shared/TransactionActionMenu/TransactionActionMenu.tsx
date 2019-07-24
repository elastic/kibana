/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiLink
} from '@elastic/eui';
import chrome from 'ui/chrome';
import url from 'url';
import { i18n } from '@kbn/i18n';
import React, { useState, FunctionComponent } from 'react';
import { idx } from '@kbn/elastic-idx';
import { pick } from 'lodash';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { DiscoverTransactionLink } from '../Links/DiscoverLinks/DiscoverTransactionLink';
import { InfraLink } from '../Links/InfraLink';
import { useUrlParams } from '../../../hooks/useUrlParams';
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

function ActionMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <EuiButtonEmpty iconType="arrowDown" iconSide="right" onClick={onClick}>
      {i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
        defaultMessage: 'Actions'
      })}
    </EuiButtonEmpty>
  );
}

interface Props {
  readonly transaction: Transaction;
}

export const TransactionActionMenu: FunctionComponent<Props> = (
  props: Props
) => {
  const { transaction } = props;

  const [isOpen, setIsOpen] = useState(false);

  const { urlParams } = useUrlParams();

  const hostName = idx(transaction, _ => _.host.hostname);
  const podId = idx(transaction, _ => _.kubernetes.pod.uid);
  const containerId = idx(transaction, _ => _.container.id);

  const time = Math.round(transaction.timestamp.us / 1000);
  const infraMetricsQuery = getInfraMetricsQuery(transaction);

  const infraItems = [
    {
      icon: 'loggingApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showPodLogsLinkLabel',
        { defaultMessage: 'Show pod logs' }
      ),
      condition: podId,
      path: `/link-to/pod-logs/${podId}`,
      query: { time }
    },
    {
      icon: 'loggingApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showContainerLogsLinkLabel',
        { defaultMessage: 'Show container logs' }
      ),
      condition: containerId,
      path: `/link-to/container-logs/${containerId}`,
      query: { time }
    },
    {
      icon: 'loggingApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostLogsLinkLabel',
        { defaultMessage: 'Show host logs' }
      ),
      condition: hostName,
      path: `/link-to/host-logs/${hostName}`,
      query: { time }
    },
    {
      icon: 'loggingApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showTraceLogsLinkLabel',
        { defaultMessage: 'Show trace logs' }
      ),
      condition: true,
      hash: `/link-to/logs`,
      query: { time, filter: `trace.id:${transaction.trace.id}` }
    },
    {
      icon: 'infraApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showPodMetricsLinkLabel',
        { defaultMessage: 'Show pod metrics' }
      ),
      condition: podId,
      path: `/link-to/pod-detail/${podId}`,
      query: infraMetricsQuery
    },
    {
      icon: 'infraApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showContainerMetricsLinkLabel',
        { defaultMessage: 'Show container metrics' }
      ),
      condition: containerId,
      path: `/link-to/container-detail/${containerId}`,
      query: infraMetricsQuery
    },
    {
      icon: 'infraApp',
      label: i18n.translate(
        'xpack.apm.transactionActionMenu.showHostMetricsLinkLabel',
        { defaultMessage: 'Show host metrics' }
      ),
      condition: hostName,
      path: `/link-to/host-detail/${hostName}`,
      query: infraMetricsQuery
    }
  ].map(({ icon, label, condition, path, query }, index) => ({
    icon,
    key: `infra-link-${index}`,
    child: (
      <InfraLink path={path} query={query}>
        {label}
      </InfraLink>
    ),
    condition
  }));

  const uptimeLink = url.format({
    pathname: chrome.addBasePath('/app/uptime'),
    hash: `/?${fromQuery(
      pick(
        {
          dateRangeStart: urlParams.rangeFrom,
          dateRangeEnd: urlParams.rangeTo,
          search: `url.domain:${idx(transaction, t => t.url.domain)}`
        },
        (val: string) => !!val
      )
    )}`
  });

  const menuItems = [
    ...infraItems,
    {
      icon: 'discoverApp',
      key: 'discover-transaction',
      condition: true,
      child: (
        <DiscoverTransactionLink transaction={transaction}>
          {i18n.translate(
            'xpack.apm.transactionActionMenu.viewSampleDocumentLinkLabel',
            {
              defaultMessage: 'View sample document'
            }
          )}
        </DiscoverTransactionLink>
      )
    },
    {
      icon: 'uptimeApp',
      key: 'uptime',
      child: (
        <EuiLink href={uptimeLink}>
          {i18n.translate('xpack.apm.transactionActionMenu.viewInUptime', {
            defaultMessage: 'View monitor status'
          })}
        </EuiLink>
      ),
      condition: idx(transaction, _ => _.url.domain)
    }
  ]
    .filter(({ condition }) => condition)
    .map(({ icon, key, child, condition }) =>
      condition ? (
        <EuiContextMenuItem icon={icon} key={key}>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>{child}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="popout" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiContextMenuItem>
      ) : null
    );

  return (
    <EuiPopover
      id="transactionActionMenu"
      button={<ActionMenuButton onClick={() => setIsOpen(!isOpen)} />}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={menuItems}
        title={i18n.translate('xpack.apm.transactionActionMenu.actionsLabel', {
          defaultMessage: 'Actions'
        })}
      />
    </EuiPopover>
  );
};
