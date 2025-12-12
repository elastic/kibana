/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { changeFieldTypeInSchema } from '../../../../../../../common/translations';
import { MitigationAccordion } from '../mitigation_accordion';

export function ChangeFieldTypeInSchema({
  isLoading,
  schemaUrl,
}: {
  isLoading: boolean;
  schemaUrl?: string;
}) {
  return (
    <MitigationAccordion
      title={changeFieldTypeInSchema}
      isLoading={isLoading}
      dataTestSubjPrefix="datasetQualityDetailsFlyoutChangeFieldTypeInSchema"
    >
      <EuiText size="s">
        <ol>
          <li>
            <FormattedMessage
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.changeFieldTypeInSchemaText1"
              defaultMessage="Navigate to this stream's {schemaTab}."
              values={{
                schemaTab: (
                  <EuiLink
                    data-test-subj="datasetQualityDetailsFlyoutChangeFieldTypeInSchemaAccordionLinkSchemaTabLink"
                    data-test-url={schemaUrl}
                    href={schemaUrl}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.datasetQuality.details.degradedField.possibleMitigation.changeFieldTypeInSchemaSchemaTab',
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
              id="xpack.datasetQuality.details.degradedField.possibleMitigation.changeFieldTypeInSchemaText2"
              defaultMessage="Change the field's type in the schema to one that correctly matches the data."
            />
            <EuiSpacer size="m" />
          </li>
        </ol>
      </EuiText>
    </MitigationAccordion>
  );
}
