/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescribedFormGroup,
  EuiCode,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { InputFieldProps } from './input_fields';

interface FieldsConfigurationPanelProps {
  containerFieldProps: InputFieldProps;
  hostFieldProps: InputFieldProps;
  isLoading: boolean;
  readOnly: boolean;
  podFieldProps: InputFieldProps;
  tiebreakerFieldProps: InputFieldProps;
  timestampFieldProps: InputFieldProps;
}

export const FieldsConfigurationPanel = ({
  containerFieldProps,
  hostFieldProps,
  isLoading,
  readOnly,
  podFieldProps,
  tiebreakerFieldProps,
  timestampFieldProps,
}: FieldsConfigurationPanelProps) => (
  <EuiForm>
    <EuiTitle size="s">
      <h3>
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.fieldsSectionTitle"
          defaultMessage="Fields"
        />
      </h3>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiDescribedFormGroup
      idAria="timestampField"
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.timestampFieldLabel"
            defaultMessage="Timestamp"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.timestampFieldDescription"
          defaultMessage="Timestamp used to sort log entries"
        />
      }
    >
      <EuiFormRow
        describedByIds={['timestampField']}
        error={timestampFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.timestampFieldRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>@timestamp</EuiCode>,
            }}
          />
        }
        isInvalid={timestampFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.timestampFieldLabel"
            defaultMessage="Timestamp"
          />
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...timestampFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
    <EuiDescribedFormGroup
      idAria="tiebreakerField"
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.tiebreakerFieldLabel"
            defaultMessage="Tiebreaker"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.tiebreakerFieldDescription"
          defaultMessage="Field used to break ties between two entries with the same timestamp"
        />
      }
    >
      <EuiFormRow
        describedByIds={['tiebreakerField']}
        error={tiebreakerFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.tiebreakerFieldRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>_doc</EuiCode>,
            }}
          />
        }
        isInvalid={tiebreakerFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.tiebreakerFieldLabel"
            defaultMessage="Tiebreaker"
          />
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...tiebreakerFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
    <EuiDescribedFormGroup
      idAria="containerField"
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.containerFieldLabel"
            defaultMessage="Container ID"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.containerFieldDescription"
          defaultMessage="Field used to identify Docker containers"
        />
      }
    >
      <EuiFormRow
        describedByIds={['containerField']}
        error={containerFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.containerFieldRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>container.id</EuiCode>,
            }}
          />
        }
        isInvalid={containerFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.containerFieldLabel"
            defaultMessage="Container ID"
          />
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...containerFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
    <EuiDescribedFormGroup
      idAria="hostNameField"
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.hostNameFieldLabel"
            defaultMessage="Host name"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.hostNameFieldDescription"
          defaultMessage="Field used to identify hosts"
        />
      }
    >
      <EuiFormRow
        describedByIds={['hostNameField']}
        error={hostFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.hostFieldDescription"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>host.name</EuiCode>,
            }}
          />
        }
        isInvalid={hostFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.hostFieldLabel"
            defaultMessage="Host name"
          />
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...hostFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
    <EuiDescribedFormGroup
      idAria="podField"
      title={
        <h4>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.podFieldLabel"
            defaultMessage="Pod ID"
          />
        </h4>
      }
      description={
        <FormattedMessage
          id="xpack.infra.sourceConfiguration.podFieldDescription"
          defaultMessage="Field used to identify Kubernetes pods"
        />
      }
    >
      <EuiFormRow
        describedByIds={['podField']}
        error={podFieldProps.error}
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.podFieldRecommendedValue"
            defaultMessage="The recommended value is {defaultValue}"
            values={{
              defaultValue: <EuiCode>kubernetes.pod.uid</EuiCode>,
            }}
          />
        }
        isInvalid={podFieldProps.isInvalid}
        label={
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.podFieldLabel"
            defaultMessage="Pod ID"
          />
        }
      >
        <EuiFieldText
          fullWidth
          disabled={isLoading}
          readOnly={readOnly}
          isLoading={isLoading}
          {...podFieldProps}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  </EuiForm>
);
