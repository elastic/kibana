/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { createConvertProcessor } from '../../../../../../../common/translations';
import { MitigationAccordion } from '../mitigation_accordion';

export const CreateConvertProcessor = ({
  isLoading,
  processingUrl,
}: {
  isLoading: boolean;
  processingUrl?: string;
}) => {
  return (
    <MitigationAccordion
      title={createConvertProcessor}
      isLoading={isLoading}
      dataTestSubjPrefix="datasetQualityDetailsFlyoutCreateConvertProcessor"
    >
      <EuiText size="s">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.createConvertProcessorText1"
              defaultMessage="Navigate to this stream's {processingTab}."
              values={{
                processingTab: (
                  <EuiLink
                    data-test-subj="datasetQualityDetailsFlyoutCreateConvertProcessorAccordionProcessingTabLink"
                    data-test-url={processingUrl}
                    href={processingUrl}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.datasetQuality.details.degradedField.possibleMitigation.createConvertProcessorProcessingTab',
                      {
                        defaultMessage: 'processing tab',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
            <EuiSpacer size="m" />
          </li>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.createConvertProcessorText2"
              defaultMessage="Create a new convert processor to change the field's type to one that correctly matches the data."
            />
            <EuiSpacer size="m" />
          </li>
        </ol>
      </EuiText>
    </MitigationAccordion>
  );
};
