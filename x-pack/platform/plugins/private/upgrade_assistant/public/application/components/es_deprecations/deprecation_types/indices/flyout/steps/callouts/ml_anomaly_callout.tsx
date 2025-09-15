/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { useAppContext } from '../../../../../../../app_context';

export const MlAnomalyCallout: FunctionComponent = () => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();
  return (
    <Fragment>
      <EuiCallOut
        title={i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleMlAnomalyIndexTitle',
          { defaultMessage: 'ML anomaly index detected' }
        )}
      >
        <FormattedMessage
          id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleMlAnomalyIndexText"
          defaultMessage="Anomaly result indices that were created in 7.x must be either reindexed, set to read-only, or deleted before upgrading to 9.x. {learnMore}."
          values={{
            learnMore: (
              <EuiLink target="_blank" href={docLinks.links.ml.anomalyMigrationGuide}>
                {i18n.translate(
                  'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleMlAnomalyIndexText.learnMore',
                  { defaultMessage: 'Learn more' }
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
