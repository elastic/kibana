/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { TextNoteEventData } from '../../common/conversation_events/text_note';

export const TextNoteRenderer: React.FC<{ data: TextNoteEventData }> = ({ data }) => (
  <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
    {data.title && (
      <>
        <EuiTitle size="xxs">
          <h4>{data.title}</h4>
        </EuiTitle>
        <EuiSpacer size="xs" />
      </>
    )}
    <EuiText size="s">
      <p>{data.text}</p>
    </EuiText>
  </EuiPanel>
);
