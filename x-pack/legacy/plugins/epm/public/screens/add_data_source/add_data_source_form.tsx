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
import React, { Fragment, useState } from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { installDatasource } from '../../data';
import { useCore, useLinks } from '../../hooks';
import { StepOne } from './step_one';
import { Dataset } from '../../../common/types';

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
  pkgName: string;
  pkgTitle: string;
  pkgVersion: string;
  datasets: Dataset[];
}
export interface FormState {
  datasourceName: string;
  datasets: EuiCheckboxGroupIdToSelectedMap;
  policies: Array<EuiComboBoxOptionProps<string>>;
}

const FormNav = styled.div`
  text-align: right;
`;

export const AddDataSourceForm = (props: AddDataSourceStepsProps) => {
  const defaultPolicyOption = { label: 'Default policy', value: 'default' };
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
  const { pkgName, pkgTitle, pkgVersion, datasets } = props;

  const handleRequestInstallDatasource = async () => {
    try {
      await installDatasource({
        pkgkey: `${pkgName}-${pkgVersion}`,
        datasets: datasets.filter(d => formState.datasets[d.name] === true),
        datasourceName: formState.datasourceName,
        // @ts-ignore not sure where/how to enforce a `value` key
        policyIds: formState.policies.map(({ value }) => value),
      });
      setAddDataSourceSuccess(true);
      notifications.toasts.addSuccess({
        title: `Added ${pkgTitle} data source`,
      });
      return;
    } catch (err) {
      notifications.toasts.addWarning({
        title: `Failed to add data source to ${pkgTitle}`,
        iconType: 'alert',
      });
    }
  };

  const onCheckboxChange = (id: string) =>
    setSelectedDatasets({
      ...selectedDatasets,
      [id]: !selectedDatasets[id],
    });

  const onTextChange = (evt: React.ChangeEvent<HTMLInputElement>) =>
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
          onCheckboxChange={onCheckboxChange}
          onTextChange={onTextChange}
          policyOptions={[
            defaultPolicyOption,
            { label: 'Foo policy', value: 'd09bbe00-21e0-11ea-9786-4545a9e62b25' },
          ]}
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
            name: pkgName,
            version: pkgVersion,
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
