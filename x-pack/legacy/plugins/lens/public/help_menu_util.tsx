/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiLink, EuiText, EuiIcon, EuiButton } from '@elastic/eui';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Chrome } from 'ui/chrome';

const docsPage = undefined;

export function addHelpMenuToAppChrome(chrome: Chrome) {
  chrome.helpExtension.set(domElement => {
    render(<HelpMenu />, domElement);
    return () => {
      unmountComponentAtNode(domElement);
    };
  });
}

function HelpMenu() {
  return (
    <>
      <EuiHorizontalRule margin="none" />
      {docsPage && (
        <>
          <EuiSpacer />
          <EuiButton
            fill
            iconType="popout"
            href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/${docsPage}.html`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.lens.helpMenu.docLabel"
              defaultMessage="Lens documentation"
            />
          </EuiButton>
        </>
      )}

      <EuiSpacer />
      <EuiText size="s">
        <EuiIcon type="logoGithub" color="primary" /> &nbsp;
        <EuiLink href="https://github.com/elastic/kibana/issues/new" target="_blank">
          {i18n.translate('xpack.lens.helpMenu.feedbackLinkText', {
            defaultMessage: 'Provide feedback for the Lens application',
          })}
        </EuiLink>
      </EuiText>
    </>
  );
}
