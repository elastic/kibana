/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiButton, EuiEmptyPrompt, EuiLink, EuiTitle } from '@elastic/eui';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useKibana } from '../../../../hooks/use_kibana';
import { AssetImage } from '../../../asset_image';

export function PendingRootDataStreamEmptyPrompt({
  streamName,
  canManage,
  refreshDefinition,
}: {
  streamName: string;
  canManage: boolean;
  refreshDefinition: () => void;
}) {
  const {
    core: {
      notifications: { toasts },
      docLinks: { links: docLinks },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [{ loading }, createDataStream] = useAsyncFn(async () => {
    try {
      await streamsRepositoryClient.fetch('POST /internal/streams/{name}/_restore_data_stream', {
        params: {
          path: {
            name: streamName,
          },
        },
        signal: null,
      });

      toasts.addSuccess(
        i18n.translate('xpack.streams.pendingRootDataStream.create.successToast', {
          defaultMessage: 'Data stream created',
        })
      );
      refreshDefinition();
    } catch (err) {
      toasts.addError(err as Error, {
        title: i18n.translate('xpack.streams.pendingRootDataStream.create.errorToast', {
          defaultMessage: 'Failed to create data stream',
        }),
      });
    }
  }, [refreshDefinition, streamName, streamsRepositoryClient, toasts]);

  return (
    <EuiEmptyPrompt
      data-test-subj="streamsPendingRootDataStreamEmptyPrompt"
      color="plain"
      css={css`
        && {
          max-width: 400px;
          align-self: center;
        }
      `}
      icon={<AssetImage type="unableToGeneratePreview" size={140} />}
      title={
        <h2>
          {i18n.translate('xpack.streams.pendingRootDataStream.title', {
            defaultMessage: 'Data stream pending',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.streams.pendingRootDataStream.description', {
            defaultMessage:
              'The data stream will be created automatically when data is first ingested. You can also create it now and start configuring.',
          })}
        </p>
      }
      actions={
        <EuiButton
          color="primary"
          fill
          onClick={createDataStream}
          isLoading={loading}
          isDisabled={!canManage || loading}
        >
          {i18n.translate('xpack.streams.pendingRootDataStream.createButton', {
            defaultMessage: 'Create data stream',
          })}
        </EuiButton>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('xpack.streams.pendingRootDataStream.learnMore', {
                defaultMessage: 'Want to learn how to send data?',
              })}
            </span>
          </EuiTitle>{' '}
          <EuiLink
            href={`${docLinks.observability.wiredStreams}#streams-wired-streams-ship`}
            target="_blank"
            external
          >
            {i18n.translate('xpack.streams.pendingRootDataStream.docsLink', {
              defaultMessage: 'Read the docs',
            })}
          </EuiLink>
        </>
      }
    />
  );
}
