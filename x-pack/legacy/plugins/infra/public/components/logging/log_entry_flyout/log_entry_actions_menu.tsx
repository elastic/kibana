/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import url from 'url';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useVisibilityState } from '../../../utils/use_visibility_state';
import { getTraceUrl } from '../../../../../apm/public/components/shared/Links/apm/ExternalLinks';
import { LogEntriesItem } from '../../../../common/http_api';

const UPTIME_FIELDS = ['container.id', 'host.ip', 'kubernetes.pod.uid'];

export const LogEntryActionsMenu: React.FunctionComponent<{
  logItem: LogEntriesItem;
}> = ({ logItem }) => {
  const prependBasePath = useKibana().services.http?.basePath?.prepend;
  const { hide, isVisible, show } = useVisibilityState(false);

  const uptimeLink = useMemo(() => {
    const link = getUptimeLink(logItem);
    return prependBasePath && link ? prependBasePath(link) : link;
  }, [logItem, prependBasePath]);

  const apmLink = useMemo(() => {
    const link = getAPMLink(logItem);
    return prependBasePath && link ? prependBasePath(link) : link;
  }, [logItem, prependBasePath]);

  const menuItems = useMemo(
    () => [
      <EuiContextMenuItem
        data-test-subj="logEntryActionsMenuItem uptimeLogEntryActionsMenuItem"
        disabled={!uptimeLink}
        href={uptimeLink}
        icon="uptimeApp"
        key="uptimeLink"
      >
        <FormattedMessage
          id="xpack.infra.logEntryActionsMenu.uptimeActionLabel"
          defaultMessage="View status in Uptime"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        data-test-subj="logEntryActionsMenuItem apmLogEntryActionsMenuItem"
        disabled={!apmLink}
        href={apmLink}
        icon="apmApp"
        key="apmLink"
      >
        <FormattedMessage
          id="xpack.infra.logEntryActionsMenu.apmActionLabel"
          defaultMessage="View in APM"
        />
      </EuiContextMenuItem>,
    ],
    [apmLink, uptimeLink]
  );

  const hasMenuItems = useMemo(() => menuItems.length > 0, [menuItems]);
  return (
    <EuiPopover
      anchorPosition="downRight"
      button={
        <EuiButtonEmpty
          data-test-subj="logEntryActionsMenuButton"
          disabled={!hasMenuItems}
          iconSide="right"
          iconType="arrowDown"
          onClick={show}
        >
          <FormattedMessage
            id="xpack.infra.logEntryActionsMenu.buttonLabel"
            defaultMessage="Actions"
          />
        </EuiButtonEmpty>
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

const getUptimeLink = (logItem: LogEntriesItem) => {
  const searchExpressions = logItem.fields
    .filter(({ field, value }) => value != null && UPTIME_FIELDS.includes(field))
    .map(({ field, value }) => `${field}:${value}`);

  if (searchExpressions.length === 0) {
    return undefined;
  }

  return url.format({
    pathname: '/app/uptime',
    hash: `/?search=(${searchExpressions.join(' OR ')})`,
  });
};

const getAPMLink = (logItem: LogEntriesItem) => {
  const traceIdEntry = logItem.fields.find(
    ({ field, value }) => value != null && field === 'trace.id'
  );

  if (!traceIdEntry) {
    return undefined;
  }

  const timestampField = logItem.fields.find(({ field }) => field === '@timestamp');
  const timestamp = timestampField ? timestampField.value : null;
  const { rangeFrom, rangeTo } = timestamp
    ? (() => {
        const from = new Date(timestamp);
        const to = new Date(timestamp);

        from.setMinutes(from.getMinutes() - 10);
        to.setMinutes(to.getMinutes() + 10);

        return { rangeFrom: from.toISOString(), rangeTo: to.toISOString() };
      })()
    : { rangeFrom: 'now-1y', rangeTo: 'now' };

  return url.format({
    pathname: '/app/apm',
    hash: getTraceUrl({ traceId: traceIdEntry.value, rangeFrom, rangeTo }),
  });
};
