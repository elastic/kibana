/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButton, EuiPopover } from '@elastic/eui';

import { RepoSelector } from './repo_selector';

interface Props {
  onSelect: (codeId: string) => void;
  project: { mapping: boolean; url: string };
  frame: number;
}

const repos = ['a', 'b', 'c'];

export const CodeIntegration = ({ onSelect, frame, project }: Props) => {
  const [showSelector, setShowSelector] = useState(false);

  const onClick = () => {
    if (project.mapping) {
      // TODO: link to code
      console.log('going to frame', frame, 'in project', project.url);
    } else {
      setShowSelector(true);
    }
  };

  const button = <EuiButton onClick={onClick}>View in Code</EuiButton>;

  return (
    <EuiPopover
      anchorPosition="leftCenter"
      button={button}
      isOpen={showSelector}
      closePopover={() => setShowSelector(false)}
    >
      <RepoSelector onSelect={onSelect} repos={repos} />
    </EuiPopover>
  );
};
