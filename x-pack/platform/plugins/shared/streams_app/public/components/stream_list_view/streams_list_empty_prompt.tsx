/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiTitle, EuiButton, EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { AssetImage } from '../asset_image';
import { useKibana } from '../../hooks/use_kibana';

export const StreamsListEmptyPrompt = ({ onAddData }: { onAddData?: () => void }) => {
  const { docLinks } = useKibana().core;
  const streamsDocsLink = docLinks.links.observability.logsStreams;

  return (
    <EuiEmptyPrompt
      css={{
        maxInlineSize: '760px !important',
      }}
      icon={<AssetImage type="addStreams" />}
      title={
        <h2>
          {i18n.translate('xpack.streams.emptyState.title', {
            defaultMessage: 'Turn raw data into structured, manageable streams',
          })}
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <p>
          {i18n.translate('xpack.streams.emptyState.body', {
            defaultMessage:
              'Easily turn your data into clear, structured flows with simple tools for routing, field extraction, and retention. Just stream it into Elastic to get started and your new streams will appear here.',
          })}
        </p>
      }
      actions={
        onAddData ? (
          <EuiButton color="primary" fill onClick={onAddData}>
            {i18n.translate('xpack.streams.emptyState.addDataButton', {
              defaultMessage: 'Add data',
            })}
          </EuiButton>
        ) : undefined
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.streams.emptyState.learnMore', {
                defaultMessage: 'Want to learn more? ',
              })}
            </span>
          </EuiTitle>{' '}
          <EuiLink href={streamsDocsLink} target="_blank">
            {i18n.translate('xpack.streams.emptyState.learnMore.link', {
              defaultMessage: ' Read our Streams documentation',
            })}
          </EuiLink>
        </>
      }
    />
  );
};
