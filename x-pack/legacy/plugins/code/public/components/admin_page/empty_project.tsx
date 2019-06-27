/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link } from 'react-router-dom';

import { EuiButton, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { capabilities } from 'ui/capabilities';

import { ImportProject } from './import_project';

export const EmptyProject = () => {
  const isAdmin = capabilities.get().code.admin as boolean;
  return (
    <div className="codeTab__projects">
      <EuiSpacer size="xl" />
      <div className="codeTab__projects--emptyHeader">
        <EuiText>
          <h1>You don't have any repos yet</h1>
        </EuiText>
        <EuiText color="subdued">{isAdmin && <p>Let's import your first one</p>}</EuiText>
      </div>
      {isAdmin && <ImportProject />}
      <EuiSpacer />
      <EuiFlexGroup justifyContent="center">
        <Link to="/setup-guide">
          <EuiButton>View the Setup Guide</EuiButton>
        </Link>
      </EuiFlexGroup>
    </div>
  );
};
