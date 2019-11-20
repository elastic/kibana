/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiTitle, EuiFlyoutHeader, EuiFlyout } from '@elastic/eui';
import { ActionsContext } from '../../context/actions_context';
import { ActionTypeMenu } from './action_type_menu';
import { ActionAddForm } from './action_add_form';
import { ActionType } from '../../../types';

export const ActionAddFlyout = () => {
  const { flyoutVisible, setFlyoutVisibility } = useContext(ActionsContext);
  const [actionType, setActionType] = useState<ActionType | undefined>(undefined);
  const closeFlyout = useCallback(() => setFlyoutVisibility(false), []);

  useEffect(() => {
    setActionType(undefined);
  }, [flyoutVisible]);

  if (!flyoutVisible) {
    return null;
  }

  let currentForm;
  if (!actionType) {
    currentForm = <ActionTypeMenu setActionType={setActionType}></ActionTypeMenu>;
  } else {
    currentForm = <ActionAddForm actionType={actionType} />;
  }

  return (
    <EuiFlyout onClose={closeFlyout} aria-labelledby="flyoutActionAddTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3 id="flyoutTitle">
            <FormattedMessage
              defaultMessage={'Create connector'}
              id="xpack.alertingUI.sections.actionAdd.flyoutTitle"
            />
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>
      {currentForm}
    </EuiFlyout>
  );
};
