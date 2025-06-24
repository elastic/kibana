/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink, EuiText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EnrichedDeprecationInfo } from '../../../../../../../../../common/types';
import { useAppContext } from '../../../../../../../app_context';

interface Props {
  deprecation: EnrichedDeprecationInfo;
}

/**
 * We get copy directly from ES. This contains information that applies to indices
 * that are read-only or not.
 */
export const ESTransformsTargetGuidance = ({ deprecation }: Props) => {
  const {
    services: {
      core: { http },
    },
  } = useAppContext();
  return (
    <>
      <EuiCallOut
        title={i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.calloutTitle',
          { defaultMessage: 'Transforms detected' }
        )}
        data-test-subj="esTransformsGuidance"
        color="warning"
      >
        {deprecation.details}
      </EuiCallOut>
      <EuiSpacer size="s" />
      <EuiText size="m">
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.description1"
            defaultMessage="The reindex operation will copy all of the existing documents into a new index and remove the old one. During the reindex operation your data will be in a read-only state and transforms writing to this index will be paused."
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.description2"
            defaultMessage="Depending on size and resources, reindexing may take an extended time. For indices with more than 10GB of data or to avoid transform downtime refer to the {migrationGuideLink} or {transformsLink} to manage transforms writing to this index."
            values={{
              migrationGuideLink: (
                <EuiLink target="_blank" href={deprecation.url}>
                  {i18n.translate(
                    'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.migrationGuideLink',
                    { defaultMessage: 'migration guide' }
                  )}
                </EuiLink>
              ),
              transformsLink: (
                <EuiLink
                  target="_blank"
                  href={`${http.basePath.prepend('/app/management/data/transform')}`}
                >
                  <FormattedMessage
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.transfromsLink"
                    defaultMessage="go to transforms"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </>
  );
};
