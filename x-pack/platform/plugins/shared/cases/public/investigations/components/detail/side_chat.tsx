/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import * as i18n from './translations';

export interface SideChatProps {
  record: InvestigationRecord;
  agentAvailable: boolean;
}

/** Placeholder: a later change replaces this file with the compact chat. */
export const SideChat: React.FC<SideChatProps> = () => (
  <EuiEmptyPrompt
    iconType={ICONS.conversation}
    title={<h2>{i18n.CHAT_COMING}</h2>}
    titleSize="xs"
    data-test-subj="investigationSideChat"
  />
);
SideChat.displayName = 'SideChat';
