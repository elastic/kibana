/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { EuiButtonEmpty, EuiPopover, EuiText } from '@elastic/eui';

import { RepoSelector } from './repo_selector';

interface Props {
  onRepoSelect: (codeId: string) => void;
  project: { mapping: boolean; url: string };
  frame: number;
}

const repos = ['a', 'b', 'c'];

const PopoverContent = styled.div`
  margin-bottom: 1rem;
  width: 300px;
`;

export const CodeIntegration = ({ onRepoSelect, frame, project }: Props) => {
  const [showSelector, setShowSelector] = useState(false);

  const handleClick = () => {
    if (project.mapping) {
      // TODO: link to code
      console.log('going to frame', frame, 'in project', project.url);
    } else {
      setShowSelector(true);
    }
  };

  const handleSelect = (codeId: string) => {
    onRepoSelect(codeId);
    setShowSelector(false);
    // TODO: show success
  };

  const button = (
    <EuiButtonEmpty iconType="logoCode" onClick={handleClick}>
      View in Code
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      anchorPosition="leftCenter"
      button={button}
      isOpen={showSelector}
      closePopover={() => setShowSelector(false)}
    >
      <PopoverContent>
        <EuiText size="s">
          <h3>No repository mapping found</h3>
          <p>
            We can't find the mapping between service and the source code. Select the repository or
            import a new one.
          </p>
        </EuiText>
      </PopoverContent>
      <RepoSelector onSelect={handleSelect} repos={repos} />
    </EuiPopover>
  );
};
