/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useContext, useState, useCallback, useReducer, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiForm,
  EuiSpacer,
  EuiButtonEmpty,
  EuiFlyoutFooter,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyout,
  EuiFieldText,
} from '@elastic/eui';
import { useAppDependencies } from '../..';
import { AlertsContext } from '../../context/alerts_context';

interface Props {
  refreshList: () => Promise<void>;
}

export const AlertAdd = ({ refreshList }: Props) => {
  const {
    core: { http },
  } = useAppDependencies();
  const { alertFlyoutVisible, setAlertFlyoutVisibility } = useContext(AlertsContext);
  const closeFlyout = useCallback(() => setAlertFlyoutVisibility(false), []);

  if (!alertFlyoutVisible) {
    return null;
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">
            <FormattedMessage
              defaultMessage={'Create Alert'}
              id="xpack.alertingUI.sections.alertAdd.flyoutTitle"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm></EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter></EuiFlyoutFooter>
    </EuiFlyout>
  );
};
