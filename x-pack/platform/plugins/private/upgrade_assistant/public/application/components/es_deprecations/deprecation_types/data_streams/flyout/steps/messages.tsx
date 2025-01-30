/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataStreamReindexStatus } from '../../../../../../../../common/types';

export const getPrimaryButtonLabel = (status?: DataStreamReindexStatus) => {
  switch (status) {
    case DataStreamReindexStatus.fetchFailed:
    case DataStreamReindexStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case DataStreamReindexStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.reindexingLabel"
          defaultMessage="Reindexing…"
        />
      );
    case DataStreamReindexStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.restartLabel"
          defaultMessage="Restart reindexing"
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexButton.runReindexLabel"
          defaultMessage="Start reindexing"
        />
      );
  }
};
