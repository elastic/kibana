/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useCallback } from 'react';

import { EuiIcon, EuiFlexItem, EuiCard, EuiFlexGroup } from '@elastic/eui';

import { AlertingExampleComponentParams } from '../application';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

export const CreateAlert = ({
  triggersActionsUi,
}: Pick<AlertingExampleComponentParams, 'triggersActionsUi'>) => {
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  const onCloseAlertFlyout = useCallback(() => setAlertFlyoutVisibility(false), [
    setAlertFlyoutVisibility,
  ]);

  const AddAlertFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: ALERTING_EXAMPLE_APP_ID,
        onClose: onCloseAlertFlyout,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onCloseAlertFlyout]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`bell`} />}
          title={`Create Alert`}
          description="Create an new Alert based on one of our example Alert Types ."
          onClick={() => setAlertFlyoutVisibility(true)}
        />
      </EuiFlexItem>
      <EuiFlexItem>{alertFlyoutVisible && AddAlertFlyout}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
