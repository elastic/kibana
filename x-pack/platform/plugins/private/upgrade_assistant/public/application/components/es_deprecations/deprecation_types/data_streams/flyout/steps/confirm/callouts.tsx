/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut } from '@elastic/eui';

export const ReindexWarningCallout: React.FunctionComponent<{}> = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.reindex.calloutTitle"
          defaultMessage="This operation requires destructive changes that cannot be reversed"
        />
      }
      color="warning"
      iconType="warning"
    >
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.reindex.calloutDetail"
          defaultMessage="Ensure data has been backed up before continuing. To proceed with reindexing this data, confirm below."
        />
      </p>
    </EuiCallOut>
  );
};

export const ReadonlyWarningCallout: React.FunctionComponent<{}> = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.readonly.calloutTitle"
          defaultMessage="Marking this data read only could affect some of the existing setups"
        />
      }
      color="warning"
      iconType="warning"
    >
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.readonly.calloutDetail"
          defaultMessage="Make sure you have backed up your data, etc. You can always re-index this data later to make it editable."
        />
      </p>
    </EuiCallOut>
  );
};
