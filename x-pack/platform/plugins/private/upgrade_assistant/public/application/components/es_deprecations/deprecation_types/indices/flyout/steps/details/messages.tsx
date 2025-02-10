/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ReindexStatus } from '../../../../../../../../../common/types';

export const getReindexButtonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.fetchFailed:
    case ReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case ReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case ReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexButton.runReindexLabel"
          defaultMessage="Start reindexing"
        />
      );
  }
};
