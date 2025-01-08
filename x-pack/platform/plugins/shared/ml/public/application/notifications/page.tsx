/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTimefilter } from '@kbn/ml-date-picker';
import { NotificationsList } from './components/notifications_list';
import { useMlKibana } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';

export const NotificationsPage: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  useTimefilter({ timeRangeSelector: true, autoRefreshSelector: true });

  return (
    <div>
      <MlPageHeader>
        <FormattedMessage
          id="xpack.ml.notifications.notificationsLabel"
          defaultMessage="Notifications"
        />
      </MlPageHeader>

      <NodeAvailableWarning />
      <UpgradeWarning />

      <NotificationsList />

      <HelpMenu docLink={helpLink} />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default NotificationsPage;
