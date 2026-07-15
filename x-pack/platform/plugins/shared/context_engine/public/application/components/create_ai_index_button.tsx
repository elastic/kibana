/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { CONTEXT_ENGINE_PATHS } from '../paths';

export const CreateAiIndexButton = () => {
  const history = useHistory();

  return (
    <EuiButton
      fill
      data-test-subj="contextCreateAiIndexButton"
      onClick={() => history.push(CONTEXT_ENGINE_PATHS.create)}
    >
      {i18n.translate('xpack.contextEngine.createAiIndexButton', {
        defaultMessage: 'Create AI Index',
      })}
    </EuiButton>
  );
};
