/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const renderUptimeKibanaGlobalHelp = (docsSiteUrl: string, docLinkVersion: string) => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <EuiLink
        aria-label={i18n.translate('xpack.uptime.header.docsLinkAriaLabel', {
          defaultMessage: 'Go to Uptime documentation',
        })}
        href={`${docsSiteUrl}guide/en/kibana/${docLinkVersion}/xpack-uptime.html`}
        target="_blank"
      >
        <FormattedMessage
          id="xpack.uptime.header.documentationLinkText"
          defaultMessage="Uptime Docs"
          description="The link will navigate users to the Uptime UI documentation pages."
        />
      </EuiLink>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiLink
        aria-label={i18n.translate('xpack.uptime.header.helpLinkAriaLabel', {
          defaultMessage: 'Go to our discuss page',
        })}
        href="https://discuss.elastic.co/c/uptime"
        target="_blank"
      >
        <FormattedMessage
          id="xpack.uptime.header.helpLinkText"
          defaultMessage="Give Uptime feedback"
          description="The link is to a support form called 'Discuss', where users can submit feedback."
        />
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
