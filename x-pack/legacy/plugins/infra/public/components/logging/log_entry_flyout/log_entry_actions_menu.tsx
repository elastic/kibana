/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo, useState } from 'react';
import url from 'url';

import chrome from 'ui/chrome';
import { InfraLogItem } from '../../../graphql/types';

const UPTIME_FIELDS = ['container.id', 'host.ip', 'kubernetes.pod.uid'];

export const LogEntryActionsMenu: React.FunctionComponent<{
  logItem: InfraLogItem;
}> = ({ logItem }) => {
  const { hide, isVisible, show } = useVisibility();

  const uptimeLink = useMemo(() => getUptimeLink(logItem), [logItem]);

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
          defaultMessage="View monitor status"
        />
      </EuiContextMenuItem>,
    ],
    [uptimeLink]
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

const useVisibility = (initialVisibility: boolean = false) => {
  const [isVisible, setIsVisible] = useState(initialVisibility);

  const hide = useCallback(() => setIsVisible(false), [setIsVisible]);
  const show = useCallback(() => setIsVisible(true), [setIsVisible]);

  return { hide, isVisible, show };
};

const getUptimeLink = (logItem: InfraLogItem) => {
  const searchExpressions = logItem.fields
    .filter(({ field, value }) => value != null && UPTIME_FIELDS.includes(field))
    .map(({ field, value }) => `${field}:${value}`);

  if (searchExpressions.length === 0) {
    return undefined;
  }

  return url.format({
    pathname: chrome.addBasePath('/app/uptime'),
    hash: `/?search=(${searchExpressions.join(' OR ')})`,
  });
};
