/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ReindexStatus } from '../../../../../../../../../common/types';

export const getReindexButtonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.fetchFailed:
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case ReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.reindexButton.runReindexLabel"
          defaultMessage="Start reindexing"
        />
      );
  }
};

export const containerMessages = {
  unknownMessage: i18n.translate('xpack.upgradeAssistant.dataStream.flyout.unknownMessage', {
    defaultMessage: 'Unknown',
  }),
  errorLoadingDataStreamInfo: i18n.translate(
    'xpack.upgradeAssistant.dataStream.flyout.errorLoadingDataStreamInfo',
    {
      defaultMessage: 'Error loading data stream info',
    }
  ),
};
