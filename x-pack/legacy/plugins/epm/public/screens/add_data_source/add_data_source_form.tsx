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
import React, { Fragment, useEffect, useState } from 'react';
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
export interface FormState {
  datasourceName: string;
  datasets: EuiCheckboxGroupIdToSelectedMap;
  policies: Array<EuiComboBoxOptionProps<string>>;
}

const FormNav = styled.div`
  text-align: right;
`;

export const AddDataSourceForm = ({ package: pkg }: AddDataSourceStepsProps) => {
  const defaultPolicyOption: PolicyOption = { label: 'Default policy', value: 'default' };
  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([defaultPolicyOption]);
  useEffect(() => {
    getPolicies()
      .then(response => response.list)
      .then(policies => policies.map(policy => ({ label: policy.name, value: policy.id })))
      .then(setPolicyOptions);
  }, []);

  const [addDataSourceSuccess, setAddDataSourceSuccess] = useState<boolean>(false);
  const [datasourceName, setDatasourceName] = useState<FormState['datasourceName']>('');
  const [selectedDatasets, setSelectedDatasets] = useState<FormState['datasets']>({});
  const [selectedPolicies, setSelectedPolicies] = useState<FormState['policies']>([
    defaultPolicyOption,
  ]);

  const formState: FormState = {
    datasourceName,
    datasets: selectedDatasets,
    policies: selectedPolicies,
  };

  const { notifications } = useCore();
  const { toDetailView } = useLinks();
  const datasets = pkg?.datasets || [];
  const handleRequestInstallDatasource = async () => {
    try {
      await installDatasource({
        pkgkey: `${pkg.name}-${pkg.version}`,
        datasets: datasets.filter(d => formState.datasets[d.name] === true),
        datasourceName: formState.datasourceName,
        // @ts-ignore not sure where/how to enforce a `value` key on options
        policyIds: formState.policies.map(({ value }) => value),
      });
      setAddDataSourceSuccess(true);
      notifications.toasts.addSuccess({
        title: `Added ${pkg.title} data source`,
      });
      return;
    } catch (err) {
      notifications.toasts.addWarning({
        title: `Failed to add data source to ${pkg.title}`,
        iconType: 'alert',
      });
    }
  };

  const onDatasetChange = (id: string) =>
    setSelectedDatasets({
      ...selectedDatasets,
      [id]: !selectedDatasets[id],
    });

  const onNameChange = (evt: React.ChangeEvent<HTMLInputElement>) =>
    setDatasourceName(evt.target.value);

  // create checkbox items from datasets for EuiCheckboxGroup
  const checkboxes = datasets.map(dataset => ({
    id: dataset.name,
    label: dataset.title,
  }));

  const stepOne = [
    {
      title: 'Define your data source',
      children: (
        <StepOne
          datasetCheckboxes={checkboxes}
          onDatasetChange={onDatasetChange}
          onNameChange={onNameChange}
          policyOptions={policyOptions}
          onPolicyChange={setSelectedPolicies}
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
            <EuiButton fill onClick={handleRequestInstallDatasource}>
              Continue
            </EuiButton>
          </FormNav>
        </EuiPanel>
      )}
    </Fragment>
  );
};
