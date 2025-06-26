/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useAppContext } from '../../../../../../../app_context';

export const FrozenCallOut: React.FunctionComponent = () => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();

  return (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.frozenCallout.reindexFrozenIndexTitle"
            defaultMessage="This index is frozen"
          />
        }
        iconType="info"
      >
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.frozenCallout.reindexFrozenIndex"
          defaultMessage="Frozen indices will no longer be supported after the upgrade. As a result, this index will be transformed into a non-frozen index during the update operation. {docsLink}"
          values={{
            docsLink: (
              <EuiLink target="_blank" href={docLinks.links.upgradeAssistant.unfreezeApi}>
                {i18n.translate(
                  'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.learnMoreLinkLabel',
                  {
                    defaultMessage: 'Learn more',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  );
};
