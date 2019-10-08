/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiPanel } from '@elastic/eui';

import { BareCodeBlock, Props as BareProps } from './bare_codeblock';

export interface Props extends BareProps {
  className?: string;
  header?: ReactNode;
}

export const CodeBlock = ({ className, header, ...rest }: Props) => (
  <EuiPanel paddingSize="s" className={className}>
    {header}
    <BareCodeBlock {...rest} />
  </EuiPanel>
);

CodeBlock.defaultProps = BareCodeBlock.defaultProps;
