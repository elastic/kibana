/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';

import { EuiSpacer, EuiBasicTable } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { i18n } from '@kbn/i18n';
import { ml } from '../../../../../services/ml_api_service';
// @ts-ignore
import { JobIcon } from '../../../../../components/job_message_icon';
import { TransformMessage } from '../../../../../../common/types/messages';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  transformId: string;
  lastUpdate: number;
}

export const TransformMessagesPane: React.SFC<Props> = ({ transformId, lastUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function getMessages() {
    try {
      const messagesResp = await ml.dataFrame.getTransformAuditMessages(transformId);
      setMessages(messagesResp);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(
        i18n.translate('xpack.ml.dfJobsList.jobDetails.messagesPane.errorMessage', {
          defaultMessage: 'Messages could not be loaded',
        })
      );
    }
  }

  useEffect(
    () => {
      getMessages();
    },
    [lastUpdate]
  );

  const columns = [
    {
      name: '',
      render: (message: TransformMessage) => <JobIcon message={message} />,
      width: '5%',
    },
    {
      name: i18n.translate('xpack.ml.dfJobsList.jobDetails.messagesPane.timeLabel', {
        defaultMessage: 'Time',
      }),
      render: (message: any) => formatDate(message.timestamp, TIME_FORMAT),
    },
    {
      field: 'node_name',
      name: i18n.translate('xpack.ml.dfJobsList.jobDetails.messagesPane.nodeLabel', {
        defaultMessage: 'Node',
      }),
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ml.dfJobsList.jobDetails.messagesPane.messageLabel', {
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
