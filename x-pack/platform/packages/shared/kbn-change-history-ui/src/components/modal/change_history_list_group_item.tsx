/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiListGroupItem } from '@elastic/eui';
import { useChangeHistoryInternalConfig } from '../../provider/use_change_history_internal_config';
import * as i18n from '../timeline/translations';

export function ChangeHistoryListGroupItem(): JSX.Element {
  const { openModal } = useChangeHistoryInternalConfig();

  const handleClick = useCallback(() => {
    openModal();
  }, [openModal]);

  return (
    <EuiListGroupItem
      iconType="clockCounter"
      label={i18n.HISTORY_LIST_ITEM_LABEL}
      onClick={handleClick}
      data-test-subj="changeHistoryListGroupItem"
    />
  );
}
