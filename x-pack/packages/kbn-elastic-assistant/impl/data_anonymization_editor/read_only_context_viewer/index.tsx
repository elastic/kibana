/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock } from '@elastic/eui';
import React from 'react';
import { SYSTEM_PROMPT_CONTEXT_NON_I18N } from '../../assistant/prompt/translations';

export interface Props {
  rawData: string;
}

const ReadOnlyContextViewerComponent: React.FC<Props> = ({ rawData }) => {
  return (
    <EuiCodeBlock data-test-subj="readOnlyContextViewer" isCopyable>
      {SYSTEM_PROMPT_CONTEXT_NON_I18N(rawData)}
    </EuiCodeBlock>
  );
};

ReadOnlyContextViewerComponent.displayName = 'ReadOnlyContextViewerComponent';

export const ReadOnlyContextViewer = React.memo(ReadOnlyContextViewerComponent);
