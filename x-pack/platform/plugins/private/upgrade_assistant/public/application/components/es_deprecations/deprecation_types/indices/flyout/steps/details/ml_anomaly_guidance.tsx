/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiDescriptionList, EuiLink, EuiText } from '@elastic/eui';
import { useAppContext } from '../../../../../../../app_context';

export const MlAnomalyGuidance: FunctionComponent = () => {
  const {
    services: {
      core: { docLinks },
    },
  } = useAppContext();
  return (
    <>
      <p>
        <EuiCallOut
          title={i18n.translate(
            'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleMlAnomalyIndexTitle',
            { defaultMessage: 'ML anomaly index detected' }
          )}
        >
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.notCompatibleMlAnomalyIndexText"
            defaultMessage="Anomaly result indices that were created in 7.x must be either reindexed, marked as read-only, or deleted before upgrading to 9.x. {learnMore}."
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
      </p>
      <EuiDescriptionList
        rowGutterSize="m"
        listItems={[
          {
            title: 'Option 1: Reindex data',
            description: (
              <EuiText size="m">
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindexMlAnomalyIndexText"
                  defaultMessage="While anomaly detection results are being reindexed, jobs continue to run and process new data. However, you cannot completely delete an anomaly detection job that stores results in this index until the reindexing is complete."
                />
              </EuiText>
            ),
          },
          {
            title: 'Option 2: Mark as read-only',
            description: (
              <EuiText size="m">
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.readOnlyMlAnomalyIndexText"
                  defaultMessage="This skips reindexing and will mark the result index as read-only. It is useful for large indices that contain the results of only one or a few anomaly detection jobs. If you delete these jobs later, you will not be able to create a new job with the same name. {learnMore} about write blocks."
                  values={{
                    learnMore: (
                      <EuiLink target="_blank" href={docLinks.links.upgradeAssistant.indexBlocks}>
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
              </EuiText>
            ),
          },
          {
            title: 'Option 3: Delete this index',
            description: (
              <EuiText size="m">
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.deleteMlAnomalyIndexText"
                  defaultMessage="Use the ML UI to delete jobs that are no longer needed. The result index is deleted when all jobs that store results in it have been deleted."
                />
              </EuiText>
            ),
          },
        ]}
      />
    </>
  );
};
