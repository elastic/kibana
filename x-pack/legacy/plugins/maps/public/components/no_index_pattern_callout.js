/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import React from 'react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export function NoIndexPatternCallout() {
  return (
    <EuiCallOut
      title={i18n.translate('xpack.maps.noIndexPattern.messageTitle', {
        defaultMessage: `Couldn't find any index patterns with geospatial fields`,
      })}
      color="warning"
    >
      <p>
        <FormattedMessage
          id="xpack.maps.noIndexPattern.doThisPrefixDescription"
          defaultMessage="You'll need to "
        />
        <EuiLink href={chrome.addBasePath('/app/kibana#/management/kibana/index_pattern')}>
          <FormattedMessage
            id="xpack.maps.noIndexPattern.doThisLinkTextDescription"
            defaultMessage="create an index pattern"
          />
        </EuiLink>
        <FormattedMessage
          id="xpack.maps.noIndexPattern.doThisSuffixDescription"
          defaultMessage=" with geospatial fields."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.maps.noIndexPattern.hintDescription"
          defaultMessage="Don't have any geospatial data sets? "
        />
        <EuiLink href={chrome.addBasePath('/app/kibana#/home/tutorial_directory/sampleData')}>
          <FormattedMessage
            id="xpack.maps.noIndexPattern.getStartedLinkText"
            defaultMessage="Get started with some sample data sets."
          />
        </EuiLink>
      </p>
    </EuiCallOut>
  );
}
