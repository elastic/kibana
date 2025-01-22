/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';

interface Props {
  children: React.ReactNode; // Note - ReactNodes (vs strings) will not have syntax highlighting
  padding?: 'small' | 'normal';
}

export const CodeBlock = ({ children, padding = 'normal' }: Props) => (
  <EuiCodeBlock paddingSize={padding === 'normal' ? 'l' : 's'}>{children}</EuiCodeBlock>
);
