/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiLink } from '@elastic/eui';
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
    <EuiCallOut color="primary">
      <p>
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.indicesNeedReindexing"
          defaultMessage="Indices created on or before {formattedDate} need to be reindexed to a compatible format or marked as read-only."
          values={{ formattedDate }}
        />
        <br />
        <br />
        <FormattedMessage
          id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.suggestReadOnly"
          defaultMessage="Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed. {learnMoreHtml}"
          values={{
            learnMoreHtml: (
              <EuiLink href={learnMoreUrl} target="_blank">
                <FormattedMessage
                  id="xpack.upgradeAssistant.dataStream.reindexing.flyout.warningsStep.learnMoreLink"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
