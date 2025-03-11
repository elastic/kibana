/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiToolTip } from '@elastic/eui';

import { createCapabilityFailureMessage } from '../../../../../../common/utils/create_capability_failure_message';

import { useTransformCapabilities } from '../../../../hooks';

export const editActionNameText = i18n.translate(
  'xpack.transform.transformList.editActionNameText',
  {
    defaultMessage: 'Edit',
  }
);

export const EditActionName: FC = () => {
  const { canCreateTransform } = useTransformCapabilities();

  if (!canCreateTransform) {
    return (
      <EuiToolTip position="top" content={createCapabilityFailureMessage('canStartStopTransform')}>
        <>{editActionNameText}</>
      </EuiToolTip>
    );
  }

  return <>{editActionNameText}</>;
};
