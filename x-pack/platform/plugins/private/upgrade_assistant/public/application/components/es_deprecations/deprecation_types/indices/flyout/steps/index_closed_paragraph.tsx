/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useAppContext } from '../../../../../../app_context';

export const IndexClosedParagraph: React.FunctionComponent = () => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();

  return (
    <FormattedMessage
      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.indexClosed"
      defaultMessage="This index is currently closed. The Upgrade Assistant will open, reindex and then close the index. {reindexingMayTakeLongerEmph}. {learnMore}"
      values={{
        learnMore: (
          <EuiLink target="_blank" href={docLinks.links.apis.openIndex}>
            {i18n.translate(
              'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.learnMoreLinkLabel',
              {
                defaultMessage: 'Learn more',
              }
            )}
          </EuiLink>
        ),
        reindexingMayTakeLongerEmph: (
          <b>
            {i18n.translate(
              'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexTakesLonger',
              { defaultMessage: 'Reindexing may take longer than usual' }
            )}
          </b>
        ),
      }}
    />
  );
};
