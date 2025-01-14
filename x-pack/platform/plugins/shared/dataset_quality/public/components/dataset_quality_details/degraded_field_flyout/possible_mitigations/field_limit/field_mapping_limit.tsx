/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  fieldLimitMitigationConsiderationText,
  fieldLimitMitigationConsiderationText1,
  fieldLimitMitigationConsiderationText2,
  fieldLimitMitigationConsiderationText3,
  fieldLimitMitigationConsiderationText4,
  fieldLimitMitigationDescriptionText,
  increaseFieldMappingLimitTitle,
} from '../../../../../../common/translations';
import { useDegradedFields } from '../../../../../hooks';
import { IncreaseFieldMappingLimit } from './increase_field_mapping_limit';
import { FieldLimitDocLink } from './field_limit_documentation_link';
import { MessageCallout } from './message_callout';

export function FieldMappingLimit({
  areIntegrationAssetsAvailable,
}: {
  areIntegrationAssetsAvailable: boolean;
}) {
  const accordionId = useGeneratedHtmlId({
    prefix: increaseFieldMappingLimitTitle,
  });

  const { degradedFieldAnalysis } = useDegradedFields();

  const accordionTitle = (
    <EuiTitle size="xxs">
      <h6>{increaseFieldMappingLimitTitle}</h6>
    </EuiTitle>
  );

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        initialIsOpen={true}
        data-test-subj="datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion"
        paddingSize="s"
      >
        <EuiText size="xs" component="p">
          {fieldLimitMitigationDescriptionText}
        </EuiText>
        <EuiHorizontalRule margin="s" />
        <EuiText size="xs">
          <p>{fieldLimitMitigationConsiderationText}</p>

          <ul>
            <li>{fieldLimitMitigationConsiderationText1}</li>
            <li>{fieldLimitMitigationConsiderationText2}</li>
            <li>{fieldLimitMitigationConsiderationText3}</li>
            <li>{fieldLimitMitigationConsiderationText4}</li>
          </ul>
        </EuiText>
        <EuiHorizontalRule margin="s" />
        {areIntegrationAssetsAvailable && (
          <>
            <IncreaseFieldMappingLimit
              totalFieldLimit={degradedFieldAnalysis?.totalFieldLimit ?? 0}
            />
            <EuiSpacer size="s" />
            <MessageCallout />
            <EuiHorizontalRule margin="s" />
          </>
        )}
        <FieldLimitDocLink />
      </EuiAccordion>
    </EuiPanel>
  );
}
