/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiSteps, EuiText, EuiCodeBlock } from '@elastic/eui';

export { ShellEnrollmentInstructions } from './shell';
export { ContainerEnrollmentInstructions } from './container';
export { ToolsEnrollmentInstructions } from './tools';

export type ManualEnrollmentInstructions = Array<{
  title: string;
  textPre?: string;
  commands?: string[];
}>;

export const ManualEnrollmentSteps: React.SFC<{ instructions: ManualEnrollmentInstructions }> = ({
  instructions,
}) => (
  <EuiSteps
    steps={instructions.map(({ title, textPre, commands }) => ({
      title,
      children: (
        <EuiText size="s">
          {textPre ? <p>{textPre}</p> : null}
          {commands ? <EuiCodeBlock language="bash">{commands.join(`\n`)}</EuiCodeBlock> : null}
        </EuiText>
      ),
    }))}
  />
);
