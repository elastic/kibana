/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import React from 'react';
import { EuiButton, EuiCallOut, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { StreamsAppLocatorParams } from '@kbn/streams-app-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAppContext } from '../../../../app_context';

export function StreamsPromotion({ dataStreamName }: { dataStreamName: string }) {
  const {
    url,
    plugins: { streams },
  } = useAppContext();
  const streamsEnabled = useObservable(streams?.status$ || EMPTY)?.status === 'enabled';
  const streamsLocator = url.locators.get<StreamsAppLocatorParams>('STREAMS_APP_LOCATOR');

  if (!streamsEnabled || !streamsLocator) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiCallOut
        size="s"
        title={i18n.translate('xpack.idxMgmt.streamsPromotion.title', {
          defaultMessage: 'Explore the New Streams UI in Technical Preview',
        })}
        color="primary"
      >
        <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
          <EuiText size="s">
            {i18n.translate('xpack.idxMgmt.streamsPromotion.description', {
              defaultMessage:
                'A better way to manage your data streams is here! The new Streams UI provides a streamlined experience with improved insights and management tools.',
            })}
          </EuiText>
          <EuiButton onClick={() => streamsLocator.navigate({ name: dataStreamName })}>
            {i18n.translate('xpack.idxMgmt.streamsPromotion.button', {
              defaultMessage: 'Go to Streams',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiCallOut>
    </>
  );
}
