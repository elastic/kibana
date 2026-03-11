/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  formattedDate: string;
  learnMoreUrl: string;
}
export const DurationClarificationCallOut: React.FunctionComponent<Props> = ({
  formattedDate,
  learnMoreUrl,
}) => {
  return (
    <>
      <EuiCallOut color="primary" data-test-subj="dataStreamMigrationWarningsCallout">
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.indicesNeedReindexing"
          defaultMessage="Indices created on or before {formattedDate} need to be reindexed to a compatible format or set to read-only."
          values={{ formattedDate }}
        />
        <br />
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.backingIndicesUnfrozen"
          defaultMessage="If any of the backing indices of the data stream are frozen, they will be converted to non-frozen indices during the update process."
        />
        <br />
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.suggestReadOnly"
          defaultMessage="Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed. {learnMoreHtml}"
          values={{
            learnMoreHtml: (
              <EuiLink href={learnMoreUrl} target="_blank">
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.migration.flyout.warningsStep.learnMoreLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
