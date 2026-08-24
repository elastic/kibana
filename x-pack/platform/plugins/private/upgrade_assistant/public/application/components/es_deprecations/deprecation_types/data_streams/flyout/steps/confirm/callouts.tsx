/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const ReindexWarningCallout: React.FunctionComponent<{}> = () => {
  return (
    <>
      <KbnWarningCallout
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.reindex.calloutTitle"
            defaultMessage="This operation requires destructive changes that cannot be reversed"
          />
        }
        data-test-subj="reindexDsWarningCallout"
        text={
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.reindex.calloutDetail"
            defaultMessage="Ensure data has been backed up before continuing. To proceed with reindexing this data, confirm below."
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};

export const ReadonlyWarningCallout: React.FunctionComponent<{}> = () => {
  return (
    <>
      <KbnWarningCallout
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.readonly.calloutTitle"
            defaultMessage="Setting this data to read-only could affect some of the existing setups"
          />
        }
        data-test-subj="readOnlyDsWarningCallout"
        text={
          <FormattedMessage
            id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.readonly.calloutDetail"
            defaultMessage="Make sure you have backed up your data, etc. You can always re-index this data later to make it editable."
          />
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
