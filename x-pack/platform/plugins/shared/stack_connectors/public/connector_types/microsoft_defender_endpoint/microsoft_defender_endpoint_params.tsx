/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import type { ActionParamsProps } from '@kbn/alerts-ui-shared';
import { EuiFormRow, EuiText } from '@elastic/eui';
import { SUB_ACTION } from '@kbn/connector-schemas/microsoft_defender_endpoint/constants';
import type { MicrosoftDefenderEndpointActionParams } from '@kbn/connector-schemas/microsoft_defender_endpoint';
import { RUN_CONNECTOR_TEST_MESSAGE } from './translations';

const MicrosoftDefenderEndpointParamsFields = memo<
  ActionParamsProps<MicrosoftDefenderEndpointActionParams>
>(({ editAction, actionParams, index }) => {
  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', SUB_ACTION.TEST_CONNECTOR, index);
    }
  }, [actionParams.subAction, editAction, index]);

  return (
    <>
      <EuiFormRow fullWidth>
        <EuiText size="s" data-test-subj="msDefenderParams">
          {RUN_CONNECTOR_TEST_MESSAGE}
        </EuiText>
      </EuiFormRow>
    </>
  );
});

// eslint-disable-next-line import/no-default-export
export { MicrosoftDefenderEndpointParamsFields as default };
