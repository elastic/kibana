/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { EuiSpacer, EuiBasicTable } from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { i18n } from '@kbn/i18n';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { useApi } from '../../../../hooks/use_api';
import { JobIcon } from '../../../../components/job_icon';
import { TransformMessage } from '../../../../../../common/types/messages';
import { useRefreshTransformList } from '../../../../common';

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

interface Props {
  transformId: string;
}

export const ExpandedRowMessagesPane: React.FC<Props> = ({ transformId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const api = useApi();

  const getMessagesFactory = () => {
    let concurrentLoads = 0;

    return async function getMessages() {
      try {
        concurrentLoads++;

        if (concurrentLoads > 1) {
          return;
        }

        setIsLoading(true);
        const messagesResp = await api.getTransformAuditMessages(transformId);
        setIsLoading(false);
        setMessages(messagesResp as any[]);

        concurrentLoads--;

        if (concurrentLoads > 0) {
          concurrentLoads = 0;
          getMessages();
        }
      } catch (error) {
        setIsLoading(false);
        setErrorMessage(
          i18n.translate(
            'xpack.transform.transformList.transformDetails.messagesPane.errorMessage',
            {
              defaultMessage: 'Messages could not be loaded',
            }
          )
        );
      }
    };
  };

  useRefreshTransformList({ onRefresh: getMessagesFactory() });

  const columns = [
    {
      name: '',
      render: (message: TransformMessage) => <JobIcon message={message} />,
      width: `${theme.euiSizeXL}px`,
    },
    {
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.timeLabel',
        {
          defaultMessage: 'Time',
        }
      ),
      render: (message: any) => formatDate(message.timestamp, TIME_FORMAT),
    },
    {
      field: 'node_name',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.nodeLabel',
        {
          defaultMessage: 'Node',
        }
      ),
    },
    {
      field: 'message',
      name: i18n.translate(
        'xpack.transform.transformList.transformDetails.messagesPane.messageLabel',
        {
          defaultMessage: 'Message',
        }
      ),
      width: '50%',
    },
  ];

  const getPageOfMessages = ({ index, size }: { index: number; size: number }) => {
    const list = messages;
    const listLength = list.length;
    const pageStart = index * size;

    return {
      pageOfMessages: list.slice(pageStart, pageStart + size),
      totalItemCount: listLength,
    };
  };

  const onChange = ({
    page = { index: 0, size: 10 },
  }: {
    page: { index: number; size: number };
    sort: { field: string; direction: string };
  }) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  };

  const { pageOfMessages, totalItemCount } = getPageOfMessages({
    index: pageIndex,
    size: pageSize,
  });

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  return (
    <div data-test-subj="transformMessagesTabContent">
      <EuiSpacer size="s" />
      <EuiBasicTable
        className="transform__TransformTable__messagesPaneTable"
        items={pageOfMessages}
        columns={columns}
        compressed={true}
        loading={isLoading}
        error={errorMessage}
        pagination={pagination}
        onChange={onChange}
      />
    </div>
  );
};
