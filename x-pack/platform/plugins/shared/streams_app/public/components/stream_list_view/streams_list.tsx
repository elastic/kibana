/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiLoadingElastic, EuiSpacer } from '@elastic/eui';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { StreamsListEmptyPrompt } from './streams_list_empty_prompt';
import { WelcomePanel } from '../streams_listing/welcome_panel';
import { StreamsTreeTable } from './tree_table';
import { GroupStreamsCards } from './group_streams_cards';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

export function StreamsList({ streamsListFetch }: { streamsListFetch: any }) {
  const {
    features: { groupStreams },
  } = useStreamsPrivileges();

  return (
    <>
      {streamsListFetch.loading && streamsListFetch.value === undefined ? (
        <EuiEmptyPrompt
          icon={<EuiLoadingElastic size="xl" />}
          title={
            <h2>
              {i18n.translate('xpack.streams.streamsListView.loadingStreams', {
                defaultMessage: 'Loading Streams',
              })}
            </h2>
          }
        />
      ) : !streamsListFetch.loading && isEmpty(streamsListFetch.value?.streams) ? (
        <StreamsListEmptyPrompt />
      ) : (
        <>
          <WelcomePanel />
          <StreamsTreeTable
            loading={streamsListFetch.loading}
            streams={streamsListFetch.value?.streams}
            canReadFailureStore={streamsListFetch.value?.canReadFailureStore}
          />
          {groupStreams?.enabled && (
            <>
              <EuiSpacer size="l" />
              <GroupStreamsCards streams={streamsListFetch.value?.streams} />
            </>
          )}
        </>
      )}
    </>
  );
}
