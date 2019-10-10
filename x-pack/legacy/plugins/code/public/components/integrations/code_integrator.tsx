/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiText } from '@elastic/eui';

import { RepoSelector } from './repo_selector';

export interface Props {
  onRepoSelect: (repo: string) => void;
  onImportSuccess: (repo: string) => void;
  repos: string[];
}

export const CodeIntegrator = ({ onRepoSelect, onImportSuccess, repos }: Props) => {
  const [showSelector, setShowSelector] = useState(false);

  const handleClick = () => setShowSelector(true);

  const handleSelect = (codeId: string) => {
    onRepoSelect(codeId);
    setShowSelector(false);
    // TODO: show success
  };

  const link = (
    <EuiButtonEmpty
      className="codeIntegrations__link--external"
      iconType="codeApp"
      onClick={handleClick}
    >
      <EuiText size="s">View in Code</EuiText>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      anchorPosition="leftCenter"
      button={link}
      isOpen={showSelector}
      closePopover={() => setShowSelector(false)}
    >
      <EuiText size="s" className="codeIntegrations__popover">
        <h3>No repository mapping found</h3>
        <p>
          We can't find the mapping between service and the source code. Select the repository or
          import a new one.
        </p>
      </EuiText>
      <RepoSelector onSelect={handleSelect} onImport={onImportSuccess} repos={repos} />
    </EuiPopover>
  );
};
