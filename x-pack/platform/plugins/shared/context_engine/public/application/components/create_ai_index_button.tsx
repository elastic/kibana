/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useNavigation } from '../hooks/use_navigation';
import { CONTEXT_ENGINE_PATHS } from '../paths';

export const CreateAiIndexButton = () => {
  const { createContextEngineUrl } = useNavigation();

  return (
    <EuiButton
      fill
      data-test-subj="contextCreateAiIndexButton"
      href={createContextEngineUrl(CONTEXT_ENGINE_PATHS.create)}
    >
      <FormattedMessage
        id="xpack.contextEngine.createAiIndexButton"
        defaultMessage="Create AI Index"
      />
    </EuiButton>
  );
};
