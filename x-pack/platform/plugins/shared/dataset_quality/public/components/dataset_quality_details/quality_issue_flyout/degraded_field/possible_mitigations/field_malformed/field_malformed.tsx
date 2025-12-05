/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import type { StreamsAppLocatorParams } from '@kbn/streams-app-plugin/common/locators/streams_locator';
import { useDatasetQualityDetailsState } from '../../../../../../hooks';
import { changeFieldType } from '../../../../../../../common/translations';
import { useKibanaContextForPlugin } from '../../../../../../utils';
import { MitigationAccordion } from '../mitigation_accordion';

export const FieldMalformed = () => {
  const {
    loadingState: { integrationDetailsLoaded },
  } = useDatasetQualityDetailsState();

  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const { datasetDetails } = useDatasetQualityDetailsState();

  const streamsLocator = locators.get<StreamsAppLocatorParams>(STREAMS_APP_LOCATOR_ID);

  const processingUrl = useMemo(() => {
    if (!streamsLocator) {
      return '';
    }

    return streamsLocator.getRedirectUrl({
      name: datasetDetails.rawName,
      managementTab: 'processing',
    } as StreamsAppLocatorParams);
  }, [streamsLocator, datasetDetails.rawName]);

  return (
    <>
      <MitigationAccordion
        title={changeFieldType}
        isLoading={!integrationDetailsLoaded}
        dataTestSubjPrefix="datasetQualityDetailsFlyoutchangeFieldType"
      >
        <EuiText size="s">
          <ol>
            <li>
              <FormattedMessage
                id="xpack.datasetQuality.details.degradedField.possibleMitigation.changeFieldTypeText1"
                defaultMessage="Navigate to this stream's {processingTab}."
                values={{
                  processingTab: (
                    <EuiLink
                      data-test-subj="datasetQualityDetailsFlyoutChangeFieldTypeAccordionProcessingTabLink"
                      data-test-url={processingUrl}
                      href={processingUrl}
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.datasetQuality.details.degradedField.possibleMitigation.changeFieldTypeProcessingTab',
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
                id="xpack.datasetQuality.details.degradedField.possibleMitigation.changeFieldTypeText2"
                defaultMessage="Create a new convert processor to change the field's type to one that correctly matches the schema."
              />
              <EuiSpacer size="m" />
            </li>
          </ol>
        </EuiText>
      </MitigationAccordion>
      <EuiSpacer size="m" />
    </>
  );
};
