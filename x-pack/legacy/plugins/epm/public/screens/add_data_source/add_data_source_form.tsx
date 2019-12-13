/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
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
}
const FormNav = styled.div`
  text-align: right;
`;

export const AddDataSourceForm = (props: AddDataSourceStepsProps) => {
  const [addDataSourceSuccess, setAddDataSourceSuccess] = useState<boolean>(false);
  const [formState, setFormState] = useState<FormState>({ datasourceName: '', datasets: {} });
  const { notifications } = useCore();
  const { toDetailView } = useLinks();
  const { pkgName, pkgTitle, pkgVersion, datasets } = props;

  const handleRequestInstallDatasource = async () => {
    try {
      await installDatasource({
        pkgkey: `${pkgName}-${pkgVersion}`,
        datasetsToInstall: datasets.filter(d => formState.datasets[d.name] === true),
        datasourceName: formState.datasourceName,
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

  const onCheckboxChange = (name: string) => {
    const newCheckboxStateMap = {
      ...formState,
      datasets: {
        ...formState.datasets,
        [name]: !formState.datasets[name],
      },
    };
    setFormState(newCheckboxStateMap);
  };

  const onTextChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [evt.target.name]: evt.target.value });
  };

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
