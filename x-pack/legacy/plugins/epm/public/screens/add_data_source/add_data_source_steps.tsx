/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiHorizontalRule, EuiPanel, EuiSteps } from '@elastic/eui';
import React, { Fragment, useCallback, useState } from 'react';
import { Redirect } from 'react-router-dom';
import styled from 'styled-components';
import { installDatasource } from '../../data';
import { useCore, useLinks } from '../../hooks';
import { StepOneTemplate } from './step_one';

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
}
const FormNav = styled.div`
  text-align: right;
`;
export const AddDataSourceSteps = (props: AddDataSourceStepsProps) => {
  const [addDataSourceSuccess, setAddDataSourceSuccess] = useState<boolean>(false);
  const { notifications } = useCore();
  const { toDetailView } = useLinks();
  const { pkgName, pkgTitle, pkgVersion } = props;
  const handleRequestInstallDatasource = useCallback(async () => {
    try {
      await installDatasource(`${pkgName}-${pkgVersion}`);
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
  }, [notifications.toasts, pkgName, pkgTitle, pkgVersion]);
  const stepOne = [
    {
      title: 'Define your data source',
      children: <StepOneTemplate />,
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
