/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';
import { EuiButton, EuiHorizontalRule, EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { documentationLinks } from '../../lib/documentation_links';

export class HelpMenu extends React.PureComponent {
  public render() {
    return (
      <React.Fragment>
        <EuiHorizontalRule margin="none" />
        <EuiSpacer />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.code.helpMenu.helpDescription"
              defaultMessage="For Code specific information"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiButton fill iconType="popout" href={chrome.addBasePath('/app/code#/setup-guide')}>
          <FormattedMessage
            id="xpack.code.helpMenu.setupGuideButtonLabel"
            defaultMessage="Setup Guide"
          />
        </EuiButton>
        <EuiSpacer />
        <EuiButton fill iconType="popout" href={documentationLinks.code} target="_blank">
          <FormattedMessage
            id="xpack.code.helpMenu.codeDocumentationButtonLabel"
            defaultMessage="Code documentation"
          />
        </EuiButton>
      </React.Fragment>
    );
  }
}
