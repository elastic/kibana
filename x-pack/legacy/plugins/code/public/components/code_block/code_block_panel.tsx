/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiPanel } from '@elastic/eui';

import { CodeBlock, Props as CodeBlockProps } from './code_block';

export interface Props extends CodeBlockProps {
  className?: string;
  header?: ReactNode;
}

export const CodeBlockPanel = ({ className, header, ...rest }: Props) => (
  <EuiPanel paddingSize="s" className={className}>
    {header}
    <CodeBlock {...rest} />
  </EuiPanel>
);

CodeBlockPanel.defaultProps = CodeBlock.defaultProps;
