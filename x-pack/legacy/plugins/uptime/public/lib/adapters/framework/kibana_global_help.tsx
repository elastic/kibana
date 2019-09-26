/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiSpacer, EuiHorizontalRule, EuiButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const renderUptimeKibanaGlobalHelp = (docsSiteUrl: string, docLinkVersion: string) => (
  <React.Fragment>
    <EuiHorizontalRule margin="none"></EuiHorizontalRule>
    <EuiSpacer />
    <EuiText size="s">For Uptime specific information</EuiText>
    <EuiSpacer />
    <EuiButton
      fill
      iconType="popout"
      target="_blank"
      aria-label={i18n.translate('xpack.uptime.header.docsLinkAriaLabel', {
        defaultMessage: 'Go to Uptime documentation',
      })}
      href={`${docsSiteUrl}guide/en/kibana/${docLinkVersion}/xpack-uptime.html`}
    >
      <FormattedMessage
        id="xpack.uptime.header.documentationLinkText"
        defaultMessage="Uptime documentation"
        description="The link will navigate users to the Uptime UI documentation pages."
      />
    </EuiButton>
    <EuiSpacer />
    <EuiLink
      aria-label={i18n.translate('xpack.uptime.header.helpLinkAriaLabel', {
        defaultMessage: 'Go to our discuss page',
      })}
      href="https://discuss.elastic.co/c/uptime"
      target="_blank"
    >
      <FormattedMessage
        id="xpack.uptime.header.helpLinkText"
        defaultMessage="Provide feedback for Uptime"
        description="The link is to a support form called 'Discuss', where users can submit feedback."
      />
    </EuiLink>
  </React.Fragment>
);
