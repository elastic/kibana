/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';

import {
  EuiPageBody,
  EuiPageContent,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { useCore } from './app_context';

import { documentationService } from './services/documentation';
import { breadcrumbService } from './services/navigation';

export const App = () => {
  const {
    i18n: { FormattedMessage },
  } = useCore();

  // Set breadcrumb
  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, []);

  const renderPageHeader = () => (
    <>
      <EuiTitle size="l">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <h1 data-test-subj="appTitle">
              <FormattedMessage id="xpack.tasks.home.tasksTitle" defaultMessage="Task Management" />
            </h1>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={documentationService.getTasksDocUrl()}
              target="_blank"
              iconType="help"
              data-test-subj="documentationLink"
            >
              <FormattedMessage
                id="xpack.tasks.home.tasksDocLinkText"
                defaultMessage="Task Management docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiTitle size="s">
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.tasks.home.tasksDescription"
            defaultMessage="Manage tasks currently executing in your cluster."
          />
        </EuiText>
      </EuiTitle>
    </>
  );

  return (
    <EuiPageBody>
      <EuiPageContent>{renderPageHeader()}</EuiPageContent>
    </EuiPageBody>
  );
};
