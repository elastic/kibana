/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiIcon, type IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const labels = {
  body: i18n.translate('xpack.agentBuilder.conversationSpine.placeholderTab.body', {
    defaultMessage: 'Content for this tab will appear here.',
  }),
};

interface SpinePlaceholderTabProps {
  title: string;
  iconType?: IconType;
  testSubj?: string;
}

export const SpinePlaceholderTab: React.FC<SpinePlaceholderTabProps> = ({
  title,
  iconType = 'documents',
  testSubj,
}) => (
  <EuiEmptyPrompt
    icon={<EuiIcon type={iconType} size="xl" />}
    title={<h3>{title}</h3>}
    body={labels.body}
    data-test-subj={testSubj}
  />
);
