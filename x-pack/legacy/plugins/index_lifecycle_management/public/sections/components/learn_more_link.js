/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';
import { FormattedMessage } from '@kbn/i18n/react';

const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;

export class LearnMoreLink extends React.PureComponent {
  render() {
    const { href, docPath, text } = this.props;
    let url;
    if (docPath) {
      url = `${esBase}${docPath}`;
    } else {
      url = href;
    }
    const content = text ? (
      text
    ) : (
      <FormattedMessage id="xpack.indexLifecycleMgmt.learnMore" defaultMessage="Learn more" />
    );
    return (
      <EuiLink href={url} target="_blank">
        {content}
      </EuiLink>
    );
  }
}
