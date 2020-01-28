/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiComboBoxOptionProps,
  EuiHorizontalRule,
  EuiPanel,
  EuiSteps,
  EuiCheckboxGroupIdToSelectedMap,
} from '@elastic/eui';
import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { installDatasource, getPolicies } from '../../data';
import { useCore, useLinks } from '../../hooks';
import { StepOne } from './step_one';
import { PackageInfo } from '../../../common/types';

const StyledSteps = styled.div`
  .euiStep__titleWrapper {
    border-bottom: 1px solid ${props => props.theme.eui.euiBorderColor};
    padding-bottom: ${props => props.theme.eui.paddingSizes.l};
  }
  .euiStep__content {
    padding-bottom: 0;
  }
`;
interface AddDataSourceStepsProps {
  package: PackageInfo;
}
interface PolicyOption {
  label: string;
  value: string;
}

interface FormStateRows {
  datasourceName: string;
  datasets: EuiCheckboxGroupIdToSelectedMap;
  policies: Array<EuiComboBoxOptionProps<string>>;
}
type FormStateRowError = string | string[];
type FormStateRowErrors = Record<keyof FormStateRows, FormStateRowError>;
export type FormState = FormStateRows & { errors: Partial<FormStateRowErrors> };

export const isError = (error?: FormStateRowError) => {
  if (typeof error === 'undefined') {
    return false;
  } else if (typeof error === 'string') {
    return error !== '';
  } else if (Array.isArray(error)) {
    return error.some(msg => msg !== '');
  }

  return true;
};

const FormNav = styled.div`
  text-align: right;
`;

export const AddDataSourceForm = ({ package: pkg }: AddDataSourceStepsProps) => {
  const [installationRequested, setInstallationRequested] = useState<boolean>(false);
  const defaultPolicyOption: PolicyOption = { label: 'Default policy', value: 'default' };
  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([defaultPolicyOption]);
  useEffect(() => {
    getPolicies()
      .then(response => response.items)
      .then(policies => policies.map((policy: any) => ({ label: policy.name, value: policy.id })))
      .then(setPolicyOptions);
  }, []);

  const [addDataSourceSuccess, setAddDataSourceSuccess] = useState<boolean>(false);

  const [datasourceName, setDatasourceName] = useState<FormState['datasourceName']>('');
  const [datasourceError, setDatasourceError] = useState<FormStateRowErrors['datasourceName']>();

  const [selectedDatasets, setSelectedDatasets] = useState<FormState['datasets']>({});
  const [datasetsError, setDatasetsError] = useState<FormStateRowErrors['datasets']>();

  const [selectedPolicies, setSelectedPolicies] = useState<FormState['policies']>([
    defaultPolicyOption,
  ]);
  const [policiesError, setPoliciesError] = useState<FormStateRowErrors['policies']>();

  const formState: FormState = {
    datasourceName,
    datasets: selectedDatasets,
    policies: selectedPolicies,
    errors: {
      datasourceName: datasourceError,
      datasets: datasetsError,
      policies: policiesError,
    },
  };

  const { notifications } = useCore();
  const { toDetailView } = useLinks();
  const datasets = pkg?.datasets || [];
  useEffect(() => {
    const hasNoErrors = Object.values(formState.errors).every(msg => !isError(msg));

    async function attemptInstallation() {
      try {
        await installDatasource({
          pkgkey: `${pkg.name}-${pkg.version}`,
          datasets: datasets.filter(d => formState.datasets[d.name] === true),
          datasourceName: formState.datasourceName,
          // @ts-ignore not sure where/how to enforce a `value` key on options
          policyIds: formState.policies.map(({ value }) => value),
        });

        setInstallationRequested(false);
        setAddDataSourceSuccess(true);

        notifications.toasts.addSuccess({
          title: `Added ${pkg.title} data source`,
        });
      } catch (err) {
        notifications.toasts.addWarning({
          title: `Failed to add data source to ${pkg.title}`,
          iconType: 'alert',
        });
      }
    }

    if (installationRequested) {
      if (hasNoErrors) attemptInstallation();
      else setInstallationRequested(false);
    }
  }, [
    datasets,
    formState.datasets,
    formState.datasourceName,
    formState.errors,
    formState.policies,
    installationRequested,
    setInstallationRequested,
    notifications.toasts,
    pkg.name,
    pkg.title,
    pkg.version,
  ]);

  const validateName = (newName: string) => {
    const isValidNameRegex = /^[A-Za-z0-9_\-]+$/;

    if (!newName) {
      setDatasourceError('This field is required');
    } else if (!isValidNameRegex.test(newName)) {
      setDatasourceError('Name should only include letters, numbers, dash (-) or underscore(_)');
    } else {
      setDatasourceError('');
    }
  };

  const onNameChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = evt.target.value;
    setDatasourceName(newValue);
    validateName(newValue);
  };

  // create checkbox items from datasets for EuiCheckboxGroup
  const checkboxes = datasets.map(dataset => ({
    id: dataset.name,
    label: dataset.title,
  }));

  const validateDatasets = (idToSelectedMap: FormState['datasets']) => {
    const hasDataset = Object.values(idToSelectedMap).some(Boolean);
    setDatasetsError(hasDataset ? '' : 'Select at least one input');
  };

  const onDatasetChange = (id: string) => {
    const newValue = {
      ...selectedDatasets,
      [id]: !selectedDatasets[id],
    };
    setSelectedDatasets(newValue);
    validateDatasets(newValue);
  };

  const validatePolicies = (policies: FormState['policies']) => {
    const hasPolicy = Array.isArray(policies) && policies.length > 0;
    setPoliciesError(hasPolicy ? '' : 'Select at least one policy');
  };

  const onPolicyChange = (policies: FormState['policies']) => {
    setSelectedPolicies(policies);
    validatePolicies(policies);
  };

  const validateForm = useCallback((values: FormState) => {
    validateName(values.datasourceName);
    validateDatasets(values.datasets);
    validatePolicies(values.policies);
  }, []);

  const handleSubmit = useCallback(() => {
    validateForm(formState);
    setInstallationRequested(true);
  }, [formState, validateForm]);

  const stepOne = [
    {
      title: 'Define your data source',
      children: (
        <StepOne
          datasetCheckboxes={checkboxes}
          onDatasetChange={onDatasetChange}
          onNameChange={onNameChange}
          policyOptions={policyOptions}
          onPolicyChange={onPolicyChange}
          formState={formState}
        />
      ),
    },
  ];

  return (
    <Fragment>
      {addDataSourceSuccess ? (
        <Redirect
          to={toDetailView({
            name: pkg.name,
            version: pkg.version,
            panel: 'data-sources',
            withAppRoot: false,
          })}
        />
      ) : (
        <EuiPanel>
          <StyledSteps>
            <EuiSteps steps={stepOne} />
          </StyledSteps>
          <FormNav>
            <EuiHorizontalRule margin="xl" />
            <EuiButton fill onClick={handleSubmit}>
              Continue
            </EuiButton>
          </FormNav>
        </EuiPanel>
      )}
    </Fragment>
  );
};
