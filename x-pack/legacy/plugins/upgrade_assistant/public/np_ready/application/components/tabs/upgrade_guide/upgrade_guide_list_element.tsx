/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { Fragment } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { UpgradeAssistantRecipeEntry } from '../../../../../../../../../plugins/pulse_poc/server/channels/deployment/check_upgrade_assistant';

export const UpgradeGuideListElement = ({
  entry: { description, docLink, substeps = [] },
}: {
  entry: UpgradeAssistantRecipeEntry;
}) => (
  <Fragment>
    <li>
      {docLink ? (
        <EuiLink href={docLink} target="_blank">
          {description}
        </EuiLink>
      ) : (
        description
      )}
      <ol>
        {substeps.map(step => (
          <UpgradeGuideListElement entry={step} />
        ))}
      </ol>
    </li>
  </Fragment>
);
