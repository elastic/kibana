/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { StreamsAppLocatorParams } from '@kbn/streams-app-plugin/common/locators/streams_locator';
import type { LocatorPublic } from '@kbn/share-plugin/common/url_service';
import type { BasicDataStream } from '../../../../../../../common/types';
import { modifyFieldValue } from '../../../../../../../common/translations';
import { MitigationAccordion } from '../mitigation_accordion';

export function ModifyFieldValue({
  isLoading,
  datasetDetails,
  streamsLocator,
}: {
  isLoading: boolean;
  datasetDetails: BasicDataStream;
  streamsLocator?: LocatorPublic<StreamsAppLocatorParams>;
}) {
  const processorUrl = useMemo(() => {
    if (!streamsLocator) {
      return '';
    }

    return streamsLocator.getRedirectUrl({
      name: datasetDetails.rawName,
      managementTab: 'processing',
    } as StreamsAppLocatorParams);
  }, [streamsLocator, datasetDetails.rawName]);

  return (
    <MitigationAccordion
      title={modifyFieldValue}
      isLoading={isLoading}
      dataTestSubjPrefix="datasetQualityDetailsFlyoutModifyFieldValue"
    >
      <EuiText size="s">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.modifyFieldValueText1"
              defaultMessage="Navigate to this stream's {processingTab}"
              values={{
                processingTab: (
                  <EuiLink
                    data-test-subj="datasetQualityDetailsFlyoutModifyFieldValueAccordionProcessingTabLink"
                    data-test-url={processorUrl}
                    href={processorUrl}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.datasetQuality.details.degradedField.possibleMitigation.modifyFieldValueProcessingTab',
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
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.modifyFieldValueText2"
              defaultMessage="Create a new processor (ex. replace) to modify your field value to be within the acceptable character limit."
            />
            <EuiSpacer size="m" />
          </li>
        </ol>
      </EuiText>
    </MitigationAccordion>
  );
}
