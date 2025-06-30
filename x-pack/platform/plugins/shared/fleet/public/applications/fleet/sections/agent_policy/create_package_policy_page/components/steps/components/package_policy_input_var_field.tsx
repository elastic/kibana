/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFormRow, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import { useFleetStatus } from '../../../../../../../../hooks';

import { DATASET_VAR_NAME } from '../../../../../../../../../common/constants';

import { DatasetComponent } from './dataset_component';
import { SecretFieldLabel, SecretFieldWrapper, SecretInputField } from './secret_input_field';
import type { InputFieldProps } from './types';
import { getInputComponent } from './package_policy_input_component';

const FormRow = styled(EuiFormRow)`
  .euiFormRow__label {
    flex: 1;
  }

  .euiFormRow__fieldWrapper > .euiPanel {
    padding: ${(props) => props.theme.eui?.euiSizeXS};
  }
`;

export const PackagePolicyInputVarField: React.FunctionComponent<InputFieldProps> = memo(
  ({
    varDef,
    value,
    onChange,
    errors: varErrors,
    forceShowErrors,
    frozen,
    packageType,
    packageName,
    datastreams = [],
    isEditPage = false,
  }) => {
    const fleetStatus = useFleetStatus();
    const [isDirty, setIsDirty] = useState<boolean>(false);

    const { required, type, title, name, description } = varDef;
    const isInvalid = Boolean((isDirty || forceShowErrors) && !!varErrors?.length);
    const errors = isInvalid ? varErrors : null;
    const fieldLabel = title || name;
    const fieldTestSelector = fieldLabel.replace(/\s/g, '-').toLowerCase();
    // Boolean cannot be optional by default set to false
    const isOptional = useMemo(() => type !== 'bool' && !required, [required, type]);

    const secretsStorageEnabled = fleetStatus.isReady && fleetStatus.isSecretsStorageEnabled;
    const useSecretsUi = secretsStorageEnabled && varDef.secret;

    if (name === DATASET_VAR_NAME && packageType === 'input') {
      return (
        <DatasetComponent
          pkgName={packageName}
          datastreams={datastreams}
          value={value}
          onChange={onChange}
          errors={errors}
          isInvalid={isInvalid}
          isDisabled={isEditPage}
          fieldLabel={fieldLabel}
          description={description}
        />
      );
    }

    let field: JSX.Element;

    if (useSecretsUi) {
      field = (
        <SecretInputField
          varDef={varDef}
          value={value}
          onChange={onChange}
          frozen={frozen}
          packageName={packageName}
          packageType={packageType}
          datastreams={datastreams}
          isEditPage={isEditPage}
          isInvalid={isInvalid}
          fieldLabel={fieldLabel}
          fieldTestSelector={fieldTestSelector}
          isDirty={isDirty}
          setIsDirty={setIsDirty}
          getInputComponent={getInputComponent}
        />
      );
    } else {
      field = getInputComponent({
        varDef,
        value,
        onChange,
        frozen,
        isInvalid,
        fieldLabel,
        fieldTestSelector,
        isDirty,
        setIsDirty,
      });
    }

    const formRow = (
      <FormRow
        isInvalid={isInvalid}
        error={errors}
        hasChildLabel={!varDef.multi}
        label={useSecretsUi ? <SecretFieldLabel fieldLabel={fieldLabel} /> : fieldLabel}
        labelAppend={
          isOptional ? (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.stepConfigure.inputVarFieldOptionalLabel"
                defaultMessage="Optional"
              />
            </EuiText>
          ) : undefined
        }
        helpText={description && <ReactMarkdown children={description} />}
        fullWidth
      >
        {field}
      </FormRow>
    );

    return <>{useSecretsUi ? <SecretFieldWrapper>{formRow}</SecretFieldWrapper> : formRow}</>;
  }
);
