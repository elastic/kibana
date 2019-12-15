/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { CURRENT_MAJOR_VERSION, NEXT_MAJOR_VERSION } from '../../../../common/version';

export const LatestMinorBanner: React.FunctionComponent = () => (
  <EuiCallOut
    title={
      <FormattedMessage
        id="xpack.upgradeAssistant.tabs.incompleteCallout.calloutTitle"
        defaultMessage="Issues list might be incomplete"
      />
    }
    color="warning"
    iconType="help"
  >
    <p>
      <FormattedMessage
        id="xpack.upgradeAssistant.tabs.incompleteCallout.calloutBody.calloutDetail"
        defaultMessage="The complete list of {breakingChangesDocButton} in Elasticsearch {nextEsVersion}
            will be available in the final {currentEsVersion} minor release. When the list
            is complete, this warning will go away."
        values={{
          breakingChangesDocButton: (
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes.html"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.upgradeAssistant.tabs.incompleteCallout.calloutBody.breackingChangesDocButtonLabel"
                defaultMessage="deprecations and breaking changes"
              />
            </EuiLink>
          ),
          nextEsVersion: `${NEXT_MAJOR_VERSION}.x`,
          currentEsVersion: `${CURRENT_MAJOR_VERSION}.x`,
        }}
      />
    </p>
  </EuiCallOut>
);
