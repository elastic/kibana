/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  DataStreamMigrationStatus,
  DataStreamResolutionType,
} from '../../../../../../../common/types';

export const getPrimaryButtonLabel = (
  status?: DataStreamMigrationStatus,
  resolutionType?: DataStreamResolutionType
) => {
  switch (status) {
    case DataStreamMigrationStatus.fetchFailed:
    case DataStreamMigrationStatus.failed:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.reindexButton.tryAgainLabel"
          defaultMessage="Try again"
        />
      );
    case DataStreamMigrationStatus.inProgress:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.reindexButton.reindexingLabel"
          defaultMessage="{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} delete {Deleting} other {Migrating}}…"
          values={{ resolutionType }}
        />
      );
    case DataStreamMigrationStatus.cancelled:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.reindexButton.restartLabel"
          defaultMessage="{resolutionType, select, reindex {Restart reindexing} readonly {Restart setting to read-only} delete {Restart deleting} other {Restart migration}}"
          values={{ resolutionType }}
        />
      );
    default:
      return (
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.reindexButton.runReindexLabel"
          defaultMessage="{resolutionType, select, reindex {Start reindexing} readonly {Start setting to read-only} delete {Start deleting} other {Start migration}}"
          values={{ resolutionType }}
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
