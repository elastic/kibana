/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import React, { useState } from 'react';
import { EuiBanner, EuiImage, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { StreamsAppLocatorDefinitionParams } from '@kbn/streams-app-plugin/common/locators';
import { useAppContext } from '../../../../app_context';
import streamsPromotionIllustration from './assets/streams_promotion_illustration.png';

export function StreamsPromotion({ dataStreamName }: { dataStreamName: string }) {
  const {
    url,
    plugins: { streams },
  } = useAppContext();
  const { euiTheme } = useEuiTheme();
  const streamsEnabled = useObservable(streams?.navigationStatus$ || EMPTY)?.status === 'enabled';
  const streamsLocator =
    url.locators.get<StreamsAppLocatorDefinitionParams>(STREAMS_APP_LOCATOR_ID);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!streamsEnabled || !streamsLocator || isDismissed) {
    return null;
  }

  return (
    <EuiBanner
      css={css`
        margin: ${euiTheme.size.l};
      `}
      title={i18n.translate('xpack.idxMgmt.streamsPromotion.title', {
        defaultMessage: 'A new way to manage streams',
      })}
      text={i18n.translate('xpack.idxMgmt.streamsPromotion.description', {
        defaultMessage:
          'Our new streams interface provides a streamlined experience with improved insights and tools.',
      })}
      media={<EuiImage src={streamsPromotionIllustration} alt="" size={80} />}
      size="s"
      onDismiss={() => setIsDismissed(true)}
      dismissButtonProps={{
        'aria-label': i18n.translate('xpack.idxMgmt.streamsPromotion.dismissAriaLabel', {
          defaultMessage: 'Dismiss streams promotion banner',
        }),
      }}
      actionProps={{
        primary: {
          children: i18n.translate('xpack.idxMgmt.streamsPromotion.button', {
            defaultMessage: 'Try new streams interface',
          }),
          onClick: () => streamsLocator.navigate({ name: dataStreamName }),
          fullWidth: false,
        },
      }}
    />
  );
}
