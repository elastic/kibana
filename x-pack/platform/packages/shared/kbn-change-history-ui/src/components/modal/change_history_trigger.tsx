/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHeaderLink, type EuiHeaderLinkProps } from '@elastic/eui';
import { useChangeHistoryModal } from '../../provider/use_change_history_modal';
import * as i18n from '../timeline/translations';

type ChangeHistoryHeaderLinkProps = Pick<
  EuiHeaderLinkProps,
  'size' | 'iconSide' | 'iconSize' | 'color' | 'isDisabled' | 'isLoading' | 'aria-label'
>;

export interface ChangeHistoryTriggerProps {
  label?: string;
  iconType?: string;
  'data-test-subj'?: string;
  headerLinkProps?: ChangeHistoryHeaderLinkProps;
}

export function ChangeHistoryTrigger({
  label = i18n.TRIGGER_LABEL,
  iconType = 'clock',
  'data-test-subj': dataTestSubj = 'changeHistoryTrigger',
  headerLinkProps,
}: ChangeHistoryTriggerProps): JSX.Element {
  const { openModal } = useChangeHistoryModal();

  return (
    <EuiHeaderLink
      iconType={iconType}
      size="s"
      iconSide="left"
      iconSize="m"
      color="text"
      onClick={openModal}
      data-test-subj={dataTestSubj}
      {...headerLinkProps}
    >
      {label}
    </EuiHeaderLink>
  );
}
