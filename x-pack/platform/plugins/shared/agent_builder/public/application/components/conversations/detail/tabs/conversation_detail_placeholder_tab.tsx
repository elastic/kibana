/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

interface ConversationDetailPlaceholderTabProps {
  iconType: string;
  title: string;
  body: string;
}

export const ConversationDetailPlaceholderTab: React.FC<ConversationDetailPlaceholderTabProps> = ({
  iconType,
  title,
  body,
}) => {
  return <EuiEmptyPrompt iconType={iconType} title={<h2>{title}</h2>} body={body} />;
};
