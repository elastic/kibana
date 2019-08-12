/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useState } from 'react';

import { EuiSpacer, EuiBasicTable } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { i18n } from '@kbn/i18n';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { ml } from '../../../../../services/ml_api_service';
// @ts-ignore
import { JobIcon } from '../../../../../components/job_message_icon';
import { AnalyticsMessage } from '../../../../../../common/types/audit_message';
import { useRefreshAnalyticsList } from '../../../../common';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  analyticsId: string;
}

export const ExpandedRowMessagesPane: FC<Props> = ({ analyticsId }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getMessagesFactory = () => {
    let concurrentLoads = 0;

    return async function getMessages() {
      try {
        concurrentLoads++;

        if (concurrentLoads > 1) {
          return;
        }

        setIsLoading(true);
        const messagesResp = await ml.dataFrameAnalytics.getAnalyticsAuditMessages(analyticsId);
        setIsLoading(false);
        setMessages(messagesResp);

        concurrentLoads--;

        if (concurrentLoads > 0) {
          concurrentLoads = 0;
          getMessages();
        }
      } catch (error) {
        setIsLoading(false);
        setErrorMessage(
          i18n.translate('xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.errorMessage', {
            defaultMessage: 'Messages could not be loaded',
          })
        );
      }
    };
  };

  useRefreshAnalyticsList({ onRefresh: getMessagesFactory() });

  const columns = [
    {
      name: '',
      render: (message: AnalyticsMessage) => <JobIcon message={message} />,
      width: `${theme.euiSizeXL}px`,
    },
    {
      name: i18n.translate('xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.timeLabel', {
        defaultMessage: 'Time',
      }),
      render: (message: any) => formatDate(message.timestamp, TIME_FORMAT),
    },
    {
      field: 'node_name',
      name: i18n.translate('xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.nodeLabel', {
        defaultMessage: 'Node',
      }),
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ml.dfAnalyticsList.analyticsDetails.messagesPane.messageLabel', {
        defaultMessage: 'Message',
      }),
      width: '50%',
    },
  ];

  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiBasicTable
        items={messages}
        columns={columns}
        compressed={true}
        loading={isLoading}
        error={errorMessage}
      />
    </Fragment>
  );
};
