/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useChangeHistoryDetail } from '../../hooks/use_change_history_detail';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import { ChangeHistoryRestoreButton } from './change_history_restore_button';

export function ChangeHistoryDefaultPreviewFooter(): JSX.Element | null {
  const { adapter, objectId, selectedChangeId, supports } = useChangeHistoryConfig();
  const { change, isLoading } = useChangeHistoryDetail({
    adapter,
    objectId,
    changeId: selectedChangeId,
    enabled: supports.restore && Boolean(selectedChangeId),
  });
  const { euiTheme } = useEuiTheme();

  if (!supports.restore || isLoading || !change) {
    return null;
  }

  return (
    <EuiFlexGroup
      justifyContent="flexEnd"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.m} ${euiTheme.size.l};
      `}
      data-test-subj="changeHistoryDefaultPreviewFooter"
    >
      <EuiFlexItem grow={false}>
        <ChangeHistoryRestoreButton change={change} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
