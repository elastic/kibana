/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiCode, EuiDescriptionList, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAppContext } from '../../../../../../../app_context';

interface Props {
  index: string;
  transformIds: string[];
}

export const ESTransformsTargetGuidance = ({ index, transformIds }: Props) => {
  const {
    services: {
      core: { http },
    },
  } = useAppContext();
  return (
    <EuiDescriptionList
      data-test-subj="esTransformsGuidance"
      rowGutterSize="m"
      listItems={[
        {
          title: i18n.translate(
            'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.reindexDataTitle',
            { defaultMessage: 'Option 1: Reindex data' }
          ),
          description: (
            <>
              <EuiText size="m">
                <FormattedMessage
                  id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.reindexText"
                  defaultMessage="The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed."
                />
              </EuiText>
              <EuiSpacer size="m" />
              <EuiCallOut
                size="m"
                color="warning"
                title={i18n.translate(
                  'xpack.upgradeassistant.esdeprecations.indices.indexflyout.detailsstep.estransform.calloutTitle',
                  { defaultMessage: 'Transforms detected' }
                )}
              >
                <FormattedMessage
                  id="xpack.upgradeassistant.esdeprecations.indices.indexflyout.detailsstep.estransform.calloutBody"
                  defaultMessage="The following transforms will experience delayed processing while reindexing is in progress and writing is blocked:"
                />
                <EuiSpacer size="s" />
                <ul>
                  {transformIds.map((id, key) => (
                    <li key={key}>
                      <EuiCode>{id}</EuiCode>
                    </li>
                  ))}
                </ul>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          ),
        },
        {
          title: i18n.translate(
            'xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.stopTransformAndRemoveIndexTitle',
            { defaultMessage: 'Option 2: Stop all transforms and delete this index' }
          ),
          description: (
            <>
              <EuiSpacer size="s" />
              <EuiText size="m">
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.stopTransformAndRemoveIndex"
                      defaultMessage="{transformsLinkHtml} to ensure associated transforms are stopped"
                      values={{
                        transformsLinkHtml: (
                          <EuiLink
                            target="_blank"
                            href={`${http.basePath.prepend('/app/management/data/transform')}`}
                          >
                            <FormattedMessage
                              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.transfromsLink"
                              defaultMessage="Go to transforms"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.deleteIndex"
                      defaultMessage="{indexManagementLinkHtml} to delete this index"
                      values={{
                        indexManagementLinkHtml: (
                          <EuiLink
                            target="_blank"
                            href={`${http.basePath.prepend(
                              `/app/management/data/index_management/indices/index_details?indexName=${index}`
                            )}`}
                          >
                            <FormattedMessage
                              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.detailsStep.esTransform.indexMgmtLink"
                              defaultMessage="Go to index management"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
                  </li>
                </ul>
              </EuiText>
            </>
          ),
        },
      ]}
    />
  );
};
