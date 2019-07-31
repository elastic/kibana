/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';

import {
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
} from '@elastic/eui';
// @ts-ignore undeclared module
import { JobsListView } from '../../../jobs/jobs_list/components/jobs_list_view';

export const JobsListPage = () => {
  return (
    <I18nContext>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>
                {i18n.translate('xpack.ml.management.jobsList.jobsListTitle', {
                  defaultMessage: 'Jobs',
                })}
              </h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiPageContentBody>
          <JobsListView isManagementTable={true} />
        </EuiPageContentBody>
      </EuiPageContent>
    </I18nContext>
  );
};
