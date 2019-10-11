/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React from 'react';
import { Link } from 'react-router-dom';

import { EuiButton, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { npStart } from 'ui/new_platform';

import { ImportProject } from './import_project';

export const EmptyProject = () => {
  const isAdmin = get(npStart.core.application.capabilities, 'code.admin') as boolean;
  return (
    <div className="codeTab__projects">
      <EuiSpacer size="xl" />
      <div className="codeTab__projects--emptyHeader">
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.code.adminPage.repoTab.emptyRepo.noRepositoryText"
              defaultMessage="You don't have any repos yet"
            />
          </h1>
        </EuiText>
        <EuiText color="subdued">
          {isAdmin && (
            <p>
              <FormattedMessage
                id="xpack.code.adminPage.repoTab.emptyRepo.importFirstRepositoryText"
                defaultMessage="Let's import your first one"
              />
            </p>
          )}
        </EuiText>
      </div>
      {isAdmin && <ImportProject />}
      <EuiSpacer />
      <EuiFlexGroup justifyContent="center">
        <Link to="/setup-guide">
          <EuiButton>
            <FormattedMessage
              id="xpack.code.adminPage.repoTab.emptyRepo.viewSetupGuideButtonLabel"
              defaultMessage="View the Setup Guide"
            />
          </EuiButton>
        </Link>
      </EuiFlexGroup>
    </div>
  );
};
