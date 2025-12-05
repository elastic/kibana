/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCode, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { StreamsAppLocatorParams } from '@kbn/streams-app-plugin/common/locators/streams_locator';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { BasicDataStream } from '../../../../../../../common/types';
import { increaseFieldCharacterLimit } from '../../../../../../../common/translations';
import { MitigationAccordion } from '../mitigation_accordion';

export function IncreaseFieldCharacterLimit({
  isLoading,
  datasetDetails,
  streamsLocator,
}: {
  isLoading: boolean;
  datasetDetails: BasicDataStream;
  streamsLocator?: LocatorPublic<StreamsAppLocatorParams>;
}) {
  const schemaUrl = useMemo(() => {
    if (!streamsLocator) {
      return '';
    }

    return streamsLocator.getRedirectUrl({
      name: datasetDetails.rawName,
      managementTab: 'schema',
    } as StreamsAppLocatorParams);
  }, [streamsLocator, datasetDetails.rawName]);

  return (
    <MitigationAccordion
      title={increaseFieldCharacterLimit}
      isLoading={isLoading}
      dataTestSubjPrefix="datasetQualityDetailsFlyoutIncreaseFieldCharacterLimit"
    >
      <EuiText size="s">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.modifyFieldValueText1"
              defaultMessage="Navigate to this stream's {schemaTab}."
              values={{
                schemaTab: (
                  <EuiLink
                    data-test-subj="datasetQualityDetailsFlyoutIncreaseFieldCharacterLimitAccordionLinkSchemaTabLink"
                    data-test-url={schemaUrl}
                    href={schemaUrl}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.datasetQuality.details.degradedField.possibleMitigation.increaseFieldCharacterLimitSchemaTab',
                      {
                        defaultMessage: 'schema tab',
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
              defaultMessage="Use the {ignoreAboveParameter} parameter to increase the field's character limit."
              values={{
                ignoreAboveParameter: (
                  <EuiCode>
                    {i18n.translate(
                      'xpack.datasetQuality.details.degradedField.possibleMitigation.increaseFieldCharacterLimitIgnoreAboveParameter',
                      {
                        defaultMessage: 'ignore_above',
                      }
                    )}
                  </EuiCode>
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
