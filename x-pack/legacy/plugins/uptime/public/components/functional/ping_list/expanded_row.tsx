/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore formatNumber
import { formatNumber } from '@elastic/eui/lib/services/format';
import { EuiCodeBlock, EuiDescriptionList, EuiText } from '@elastic/eui';
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { Ping, HttpBody } from '../../../../common/graphql/types';

interface Props {
  ping: Ping;
}

const BodyDescription = ({ body }: { body: HttpBody }) => {
  const contentBytes = body.content_bytes || 0;
  const bodyBytes = body.bytes || 0;

  const truncatedText =
    contentBytes > 0 && contentBytes < bodyBytes
      ? i18n.translate('xpack.uptime.pingList.expandedRow.truncated', {
          defaultMessage: 'Showing first {contentBytes} bytes.',
          values: { contentBytes },
        })
      : null;
  const bodySizeText =
    bodyBytes > 0
      ? i18n.translate('xpack.uptime.pingList.expandedRow.bodySize', {
          defaultMessage: 'Body size is {bodyBytes}.',
          values: { bodyBytes: formatNumber(bodyBytes, '0b') },
        })
      : null;
  const combinedText = [truncatedText, bodySizeText].filter(s => s).join(' ');

  return <EuiText>{combinedText}</EuiText>;
};

const BodyExcerpt = ({ content }: { content: string }) =>
  content ? <EuiCodeBlock>{content}</EuiCodeBlock> : null;

export const PingListExpandedRowComponent = ({ ping }: Props) => {
  const listItems = [];

  // Show the error block
  if (ping.error) {
    listItems.push({
      title: i18n.translate('xpack.uptime.pingList.expandedRow.error', { defaultMessage: 'Error' }),
      description: <EuiText>{ping.error.message}</EuiText>,
    });
  }

  // Show the body, if present
  if (ping.http && ping.http.response && ping.http.response.body) {
    const body = ping.http.response.body;

    listItems.push({
      title: i18n.translate('xpack.uptime.pingList.expandedRow.response_body', {
        defaultMessage: 'Response Body',
      }),
      description: (
        <Fragment>
          <BodyDescription body={body} />
          <BodyExcerpt content={body.content || ''} />
        </Fragment>
      ),
    });
  }
  return <EuiDescriptionList listItems={listItems} />;
};
