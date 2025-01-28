/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAccordion,
  EuiDescribedFormGroup,
  EuiFieldNumber,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const ServiceOptions: React.FC<{
  id: string;
  setNumberOfAllocations: (value: number) => void;
  numberOfAllocations: number;
  setNumberOfThreads: (value: number) => void;
  numberOfThreads: number;
}> = ({ id, setNumberOfAllocations, numberOfAllocations, setNumberOfThreads, numberOfThreads }) => {
  return (
    <EuiAccordion
      id={id}
      initialIsOpen
      data-test-subj="serviceOptions"
      aria-label={i18n.translate(
        'xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.accordion.ariaLabel',
        {
          defaultMessage: 'Service Options',
        }
      )}
      buttonContent={
        <EuiTitle size="xxs">
          <h6>
            {i18n.translate(
              'xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.accordion.title',
              {
                defaultMessage: 'Service Options',
              }
            )}
          </h6>
        </EuiTitle>
      }
    >
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="xxxs">
            <h6>
              {i18n.translate(
                'xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.allocationTitle',
                {
                  defaultMessage: 'Allocations:',
                }
              )}
            </h6>
          </EuiTitle>
        }
        description={
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.allocationDescription"
              defaultMessage="The number of model allocations to create."
            />
          </EuiText>
        }
        fullWidth
      >
        <EuiFormRow>
          <EuiFieldNumber
            value={numberOfAllocations}
            min={1}
            onChange={(e) => setNumberOfAllocations(e.target.valueAsNumber)}
            aria-label={i18n.translate(
              'xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.allocationNumberField.ariaLabel',
              {
                defaultMessage: 'Number of allocation',
              }
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
      <EuiSpacer size="m" />
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="xxxs">
            <h6>
              {i18n.translate(
                'xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.threadsTitle',
                {
                  defaultMessage: 'Threads:',
                }
              )}
            </h6>
          </EuiTitle>
        }
        description={
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.threadsDescription"
              defaultMessage="The number of threads to use by each model allocation."
            />
          </EuiText>
        }
        fullWidth
      >
        <EuiFormRow>
          <EuiFieldNumber
            value={numberOfThreads}
            min={1}
            max={32}
            onChange={(e) => setNumberOfThreads(e.target.valueAsNumber)}
            aria-label={i18n.translate(
              'xpack.ml.addInferenceEndpoint.elasticsearchModels.serviceOptions.threadsNumberField.ariaLabel',
              {
                defaultMessage: 'Number of Threads',
              }
            )}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    </EuiAccordion>
  );
};
