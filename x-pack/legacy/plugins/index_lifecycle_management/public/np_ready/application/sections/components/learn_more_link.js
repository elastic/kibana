/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { createDocLink } from '../../services/documentation';

export class LearnMoreLink extends React.PureComponent {
  render() {
    const { href, docPath, text } = this.props;
    let url;
    if (docPath) {
      url = createDocLink(docPath);
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
