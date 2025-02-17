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
            id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.linksText"
            defaultMessage="{learnMoreLink} or {transformsLinkHtml} to manage associated transforms."
            values={{
              learnMoreLink: (
                <EuiLink target="_blank" href={deprecation.url}>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.learnMoreLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
              transformsLinkHtml: (
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
        <p>
          <EuiText size="m">
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.reindex.option1.description"
              defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
            />
          </EuiText>
        </p>
      </EuiText>
    </>
  );
};
