/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import {
  TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR,
  uptimeOverviewLocatorID,
  type TransactionDetailsByTraceIdLocatorParams,
  type UptimeOverviewLocatorInfraParams,
} from '@kbn/deeplinks-observability';
import { FormattedMessage } from '@kbn/i18n-react';
import { getRouterLinkProps } from '@kbn/router-utils';
import type { BrowserUrlService } from '@kbn/share-plugin/public';
import React, { useMemo } from 'react';
import type { LogEntry } from '../../../../common/search_strategies/log_entries/log_entry';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useVisibilityState } from '../../../utils/use_visibility_state';

export interface LogEntryActionsMenuProps {
  logEntry: LogEntry;
}

export const LogEntryActionsMenu = ({ logEntry }: LogEntryActionsMenuProps) => {
  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();
  const { hide, isVisible, toggle } = useVisibilityState(false);

  const apmLinkProps = useMemo(() => getAPMLink({ locators })(logEntry), [locators, logEntry]);
  const uptimeLinkProps = useMemo(
    () => getUptimeLink({ locators })(logEntry),
    [locators, logEntry]
  );

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        data-test-subj="logEntryActionsMenuItem uptimeLogEntryActionsMenuItem"
        disabled={!uptimeLinkProps}
        icon="uptimeApp"
        key="uptimeLink"
        {...uptimeLinkProps}
      >
        <FormattedMessage
          id="xpack.logsShared.logEntryActionsMenu.uptimeActionLabel"
          defaultMessage="View status in Uptime"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        data-test-subj="logEntryActionsMenuItem apmLogEntryActionsMenuItem"
        disabled={!apmLinkProps}
        icon="apmApp"
        key="apmLink"
        {...apmLinkProps}
      >
        <FormattedMessage
          id="xpack.logsShared.logEntryActionsMenu.apmActionLabel"
          defaultMessage="View in APM"
        />
      </EuiContextMenuItem>,
    ],
    [apmLinkProps, uptimeLinkProps]
  );

  const hasMenuItems = useMemo(() => menuItems.length > 0, [menuItems]);
  return (
    <EuiPopover
      anchorPosition="downRight"
      button={
        <EuiButton
          data-test-subj="logEntryActionsMenuButton"
          disabled={!hasMenuItems}
          iconSide="right"
          iconType="arrowDown"
          onClick={toggle}
        >
          <FormattedMessage
            id="xpack.logsShared.logEntryActionsMenu.buttonLabel"
            defaultMessage="Investigate"
          />
        </EuiButton>
      }
      closePopover={hide}
      id="logEntryActionsMenu"
      isOpen={isVisible}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
};

const getUptimeLink =
  ({ locators }: { locators: BrowserUrlService['locators'] }) =>
  (logEntry: LogEntry) => {
    const uptimeLocator = locators.get<UptimeOverviewLocatorInfraParams>(uptimeOverviewLocatorID);

    if (!uptimeLocator) {
      return undefined;
    }

    const ipValue = logEntry.fields.find(({ field }) => field === 'host.ip')?.value?.[0];
    const containerValue = logEntry.fields.find(({ field }) => field === 'container.id')
      ?.value?.[0];
    const podValue = logEntry.fields.find(({ field }) => field === 'kubernetes.pod.uid')
      ?.value?.[0];
    const hostValue = logEntry.fields.find(({ field }) => field === 'host.name')?.value?.[0];

    const uptimeLocatorParams: UptimeOverviewLocatorInfraParams = {
      ...(typeof ipValue === 'string' && { ip: ipValue }),
      ...(typeof containerValue === 'string' && { container: containerValue }),
      ...(typeof podValue === 'string' && { pod: podValue }),
      ...(typeof hostValue === 'string' && { host: hostValue }),
    };

    if (Object.keys(uptimeLocatorParams).length === 0) {
      return undefined;
    }

    // Coercing the return value to ContextRouterLinkProps because
    // EuiContextMenuItem defines a too broad type for onClick
    return getRouterLinkProps({
      href: uptimeLocator.getRedirectUrl(uptimeLocatorParams),
      onClick: () => uptimeLocator.navigate(uptimeLocatorParams),
    }) as ContextRouterLinkProps;
  };

const getAPMLink =
  ({ locators }: { locators: BrowserUrlService['locators'] }) =>
  (logEntry: LogEntry) => {
    const traceId = logEntry.fields.find(
      ({ field, value }) => typeof value[0] === 'string' && field === 'trace.id'
    )?.value?.[0];

    if (typeof traceId !== 'string') {
      return undefined;
    }

    const apmLocator = locators.get<TransactionDetailsByTraceIdLocatorParams>(
      TRANSACTION_DETAILS_BY_TRACE_ID_LOCATOR
    );

    if (!apmLocator) {
      return undefined;
    }

    const timestampField = logEntry.fields.find(({ field }) => field === '@timestamp');
    const timestamp = timestampField ? timestampField.value[0] : null;
    const { rangeFrom, rangeTo } =
      typeof timestamp === 'number' || typeof timestamp === 'string'
        ? (() => {
            const from = new Date(timestamp);
            const to = new Date(timestamp);

            from.setMinutes(from.getMinutes() - 10);
            to.setMinutes(to.getMinutes() + 10);

            return { rangeFrom: from.toISOString(), rangeTo: to.toISOString() };
          })()
        : { rangeFrom: 'now-1y', rangeTo: 'now' };

    const apmLocatorParams = { traceId, rangeFrom, rangeTo };

    // Coercing the return value to ContextRouterLinkProps because
    // EuiContextMenuItem defines a too broad type for onClick
    return getRouterLinkProps({
      href: apmLocator.getRedirectUrl(apmLocatorParams),
      onClick: () => apmLocator.navigate(apmLocatorParams),
    }) as ContextRouterLinkProps;
  };

export interface ContextRouterLinkProps {
  href: string | undefined;
  onClick: (event: React.MouseEvent) => void;
}
