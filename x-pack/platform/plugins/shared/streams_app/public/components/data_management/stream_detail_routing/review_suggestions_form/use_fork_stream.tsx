/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { Condition } from '@kbn/streamlang';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { ToastInput } from '@kbn/core/public';
import { useKibana } from '../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../hooks/use_streams_app_fetch';
import type { StatefulStreamsAppRouter } from '../../../../hooks/use_streams_app_router';
import { useStreamsAppRouter } from '../../../../hooks/use_streams_app_router';

export interface ForkStreamParams {
  parentName: string;
  name: string;
  condition: Condition;
}

export function useForkStream(onSuccess: () => void) {
  const {
    core: coreStart,
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();
  const router = useStreamsAppRouter();

  return useAsyncFn(
    async (params: ForkStreamParams) => {
      return streamsRepositoryClient
        .fetch('POST /api/streams/{name}/_fork 2023-10-31', {
          signal: abortController.signal,
          params: {
            path: { name: params.parentName },
            body: {
              where: params.condition,
              status: 'enabled',
              stream: {
                name: params.name,
              },
            },
          },
        })
        .then((response) => {
          coreStart.notifications.toasts.addSuccess(createSuccessToast(params, router, coreStart));
          onSuccess();
          return response;
        })
        .catch((error) => {
          showErrorToast(coreStart.notifications, error);
          throw error;
        });
    },
    [abortController, coreStart.notifications, streamsRepositoryClient, telemetryClient]
  );
}

function createSuccessToast(
  params: ForkStreamParams,
  router: StatefulStreamsAppRouter,
  coreStart: CoreStart
): ToastInput {
  return {
    title: i18n.translate('xpack.streams.streamDetailRouting.createSuccessToast.title', {
      defaultMessage: 'Stream saved',
    }),
    text: toMountPoint(
      <>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.streams.streamDetailRouting.createSuccessToast.message', {
              defaultMessage: `You have successfully created a new stream called ${params.name}. To manage, open the stream.`,
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              href={router.link('/{key}/management/{tab}', {
                path: { key: params.name, tab: 'partitioning' },
              })}
              iconSide="right"
              iconType="popout"
              target="_blank"
              size="s"
              color="success"
            >
              {i18n.translate(
                'xpack.streams.streamDetailRouting.createSuccessToast.seeStreamButton',
                {
                  defaultMessage: 'See stream',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>,
      coreStart
    ),
  };
}
