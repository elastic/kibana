/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText, EuiAccordion, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { SimulationErrors } from './state_management/use_simulation_errors';

export const SimulationErrorsList = ({ errors }: { errors: SimulationErrors }) => {
  return (
    <EuiPanel paddingSize="m" hasShadow={false} grow={false}>
      {errors.definition_error && (
        <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.definitionError"
                defaultMessage="Fix the following error before saving: {error}"
                values={{ error: errors.definition_error.message }}
              />
            </p>
          </EuiText>
        </EuiPanel>
      )}
      {!isEmpty(errors.ignoredFields) && (
        <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
          <EuiAccordion
            id="ignored-fields-failures-accordion"
            initialIsOpen
            buttonContent={
              <strong>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.ignoredFieldsFailure.title',
                  { defaultMessage: 'Malformed fields detected.' }
                )}
              </strong>
            }
          >
            <EuiText component="p" size="s">
              <p>
                <FormattedMessage
                  id="xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.ignoredFieldsFailure.fieldsList"
                  defaultMessage="The following fields are malformed and won’t be stored correctly: {fields}"
                  values={{
                    fields: errors.ignoredFields.map((field) => (
                      <>
                        <EuiCode key={field}>{field}</EuiCode>{' '}
                      </>
                    )),
                  }}
                />
              </p>
              <p>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.ignoredFieldsFailure.causesLabel',
                  {
                    defaultMessage:
                      'Potential causes include type mismatches or fields exceeding configured limits.',
                  }
                )}
              </p>
              <p>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.ignoredFieldsFailure.suggestionsLabel',
                  {
                    defaultMessage:
                      'Check your field mappings, add processors to normalize values, or remove the conflicting fields.',
                  }
                )}
              </p>
            </EuiText>
          </EuiAccordion>
        </EuiPanel>
      )}
      {!isEmpty(errors.mappingFailures) && (
        <EuiPanel paddingSize="s" hasShadow={false} grow={false} color="danger">
          <EuiAccordion
            id="mapping-failures-accordion"
            initialIsOpen
            buttonContent={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.fieldMappingsFailure.title',
              {
                defaultMessage: 'Field conflicts during simulation',
              }
            )}
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.streams.streamDetailView.managementTab.enrichment.simulationErrorsList.fieldMappingsFailure.fieldsList"
                  defaultMessage="The following mapping failures occurred during the simulation:"
                />
              </p>
              <ul>
                {errors.mappingFailures.map((failureMessage, id) => (
                  <li key={id}>
                    <EuiText css={clampTwoLines} size="s">
                      {failureMessage}
                    </EuiText>
                  </li>
                ))}
              </ul>
            </EuiText>
          </EuiAccordion>
        </EuiPanel>
      )}
    </EuiPanel>
  );
};

const clampTwoLines = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;
