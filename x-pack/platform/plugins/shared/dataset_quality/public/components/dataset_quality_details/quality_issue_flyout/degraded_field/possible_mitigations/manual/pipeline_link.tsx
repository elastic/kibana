/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  copyToClipboard,
  EuiFieldText,
  EuiFormAppend,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  manualMitigationCustomPipelineCopyPipelineNameAriaText,
  manualMitigationCustomPipelineCopyPipelineNameSuccessText,
  manualMitigationCustomPipelineCreateEditPipelineLink,
  otherMitigationsCustomIngestPipeline,
} from '../../../../../../../common/translations';
import { useKibanaContextForPlugin } from '../../../../../../utils';
import { useDatasetQualityDetailsState } from '../../../../../../hooks';
import { MitigationAccordion } from '../mitigation_accordion';

export function CreateEditPipelineLink({
  areIntegrationAssetsAvailable,
}: {
  areIntegrationAssetsAvailable: boolean;
}) {
  const {
    services: {
      notifications,
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const { datasetDetails } = useDatasetQualityDetailsState();
  const { type, name } = datasetDetails;

  const pipelineName = areIntegrationAssetsAvailable ? `${type}-${name}@custom` : `${type}@custom`;

  const ingestPipelineLocator = locators.get('INGEST_PIPELINES_APP_LOCATOR');

  const pipelineUrl = ingestPipelineLocator?.useUrl(
    { pipelineId: pipelineName, page: 'pipelines_list' },
    {},
    [pipelineName]
  );

  const onClickHandler = useCallback(() => {
    const copied = copyToClipboard(pipelineName);
    if (copied) {
      notifications.toasts.addSuccess(manualMitigationCustomPipelineCopyPipelineNameSuccessText);
    }
  }, [notifications.toasts, pipelineName]);

  return (
    <MitigationAccordion
      title={otherMitigationsCustomIngestPipeline}
      isLoading={false}
      dataTestSubjPrefix="datasetQualityManualMitigationsPipeline"
    >
      <EuiText size="s">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.otherMitigationsCustomPipelineText1"
              defaultMessage="Copy the following pipeline name"
            />
            <EuiSpacer size="m" />
            <EuiFieldText
              append={
                <EuiFormAppend
                  element="button"
                  iconLeft="copy"
                  onClick={onClickHandler}
                  aria-label={manualMitigationCustomPipelineCopyPipelineNameAriaText}
                  data-test-subj="datasetQualityManualMitigationsPipelineNameCopyButton"
                />
              }
              readOnly
              aria-label={manualMitigationCustomPipelineCopyPipelineNameAriaText}
              value={pipelineName}
              data-test-subj="datasetQualityManualMitigationsPipelineName"
              fullWidth
            />
            <EuiSpacer size="m" />
          </li>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.otherMitigationsCustomPipelineText2"
              defaultMessage="Using the name you copied, {createEditPipelineLink}"
              values={{
                createEditPipelineLink: (
                  <EuiLink
                    data-test-subj="datasetQualityManualMitigationsPipelineLink"
                    data-test-url={pipelineUrl}
                    href={pipelineUrl}
                    target="_blank"
                  >
                    {manualMitigationCustomPipelineCreateEditPipelineLink}
                  </EuiLink>
                ),
              }}
            />
            <EuiSpacer size="m" />
          </li>
        </ol>
      </EuiText>
    </MitigationAccordion>
  );
}
