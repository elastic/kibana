/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';

import { EuiIcon, EuiFlexItem, EuiCard, EuiFlexGroup } from '@elastic/eui';

import { AlertingExampleComponentParams } from '../application';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

export const CreateAlert = ({
  triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
}: Pick<AlertingExampleComponentParams, 'triggersActionsUi'>) => {
  const [ruleFlyoutVisible, setRuleFlyoutVisibility] = useState<boolean>(false);

  const onCloseAlertFlyout = useCallback(
    () => setRuleFlyoutVisibility(false),
    [setRuleFlyoutVisibility]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`bell`} />}
          title={`Create Rule`}
          description="Create a new Rule based on one of our example Rule Types ."
          onClick={() => setRuleFlyoutVisibility(true)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {ruleFlyoutVisible ? (
          <AddRuleFlyout consumer={ALERTING_EXAMPLE_APP_ID} onClose={onCloseAlertFlyout} />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
