/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiTitle,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

export interface PageProps {
  nextStepPath: string;
}

export const Page: FC<PageProps> = ({ nextStepPath }) => {
  const RESULTS_PER_PAGE = 20;

  return (
    <EuiPage data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.createFromNewSearchTitle"
                  defaultMessage="From a New Search, Select Index"
                />{' '}
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.createFromSavedSearchTitle"
                  defaultMessage="Or, From a Saved Search"
                />
              </h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <SavedObjectFinder
            key="searchSavedObjectFinder"
            onChoose={(id, type) => {
              window.location.href = `${nextStepPath}?${
                type === 'index-pattern' ? 'index' : 'savedSearchId'
              }=${encodeURIComponent(id)}`;
            }}
            showFilter
            noItemsMessage={i18n.translate(
              'kbn.visualize.newVisWizard.searchSelection.notFoundLabel',
              {
                defaultMessage: 'No matching indices or saved searches found.',
              }
            )}
            savedObjectMetaData={[
              {
                type: 'search',
                getIconForSavedObject: () => 'search',
                name: i18n.translate(
                  'kbn.visualize.newVisWizard.searchSelection.savedObjectType.search',
                  {
                    defaultMessage: 'Saved search',
                  }
                ),
              },
              {
                type: 'index-pattern',
                getIconForSavedObject: () => 'indexPatternApp',
                name: i18n.translate(
                  'kbn.visualize.newVisWizard.searchSelection.savedObjectType.indexPattern',
                  {
                    defaultMessage: 'Index pattern',
                  }
                ),
              },
            ]}
            fixedPageSize={RESULTS_PER_PAGE}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
