/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import { EuiHorizontalRule, EuiSpacer, EuiLink, EuiText, EuiIcon } from '@elastic/eui';
// import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n/react';

export class HelpMenu extends PureComponent {
  render() {
    return (
      <Fragment>
        <EuiHorizontalRule margin="none" />
        {/* Leaving the below in for future addition of docs link */}
        {/* <EuiSpacer />
        <EuiButton
          fill
          iconType="popout"
          href={`${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/maps.html`}
          target="_blank"
        >
          <FormattedMessage id="xpack.maps.helpMenu.docLabel" defaultMessage="Maps documentation" />
        </EuiButton> */}
        <EuiSpacer />
        <EuiText size="s">
          <EuiIcon type="logoGithub" color="primary" /> &nbsp;
          <EuiLink href="https://github.com/elastic/kibana/issues/new" target="_blank">
            {i18n.translate('xpack.lens.helpMenu.feedbackLinkText', {
              defaultMessage: 'Provide feedback for the Lens application',
            })}
          </EuiLink>
        </EuiText>
      </Fragment>
    );
  }
}
