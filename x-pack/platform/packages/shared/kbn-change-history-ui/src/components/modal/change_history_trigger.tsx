/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { useChangeHistoryInternalConfig } from '../../provider/use_change_history_internal_config';
import * as i18n from '../timeline/translations';

export function ChangeHistoryTrigger(): JSX.Element {
  const { openModal } = useChangeHistoryInternalConfig();

  return (
    <EuiButton iconType="clock" onClick={openModal} data-test-subj="changeHistoryTrigger">
      {i18n.TRIGGER_LABEL}
    </EuiButton>
  );
}
