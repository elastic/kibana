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
import { SavedObjectFinderUi } from '../../../../../../../../../../src/plugins/saved_objects/public';
import { useMlKibana } from '../../../../contexts/kibana';

export interface PageProps {
  nextStepPath: string;
}

export const Page: FC<PageProps> = ({ nextStepPath }) => {
  const RESULTS_PER_PAGE = 20;
  const { uiSettings, savedObjects } = useMlKibana().services;

  const onObjectSelection = (id: string, type: string) => {
    window.location.href = `${nextStepPath}?${
      type === 'index-pattern' ? 'index' : 'savedSearchId'
    }=${encodeURIComponent(id)}`;
  };

  return (
    <EuiPage data-test-subj="mlPageSourceSelection">
      <EuiPageBody restrictWidth={1200}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.selectIndexPatternOrSavedSearch"
                  defaultMessage="Select index pattern or saved search"
                />
              </h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <SavedObjectFinderUi
            key="searchSavedObjectFinder"
            onChoose={onObjectSelection}
            showFilter
            noItemsMessage={i18n.translate('xpack.ml.newJob.wizard.searchSelection.notFoundLabel', {
              defaultMessage: 'No matching indices or saved searches found.',
            })}
            savedObjectMetaData={[
              {
                type: 'search',
                getIconForSavedObject: () => 'search',
                name: i18n.translate(
                  'xpack.ml.newJob.wizard.searchSelection.savedObjectType.search',
                  {
                    defaultMessage: 'Saved search',
                  }
                ),
              },
              {
                type: 'index-pattern',
                getIconForSavedObject: () => 'indexPatternApp',
                name: i18n.translate(
                  'xpack.ml.newJob.wizard.searchSelection.savedObjectType.indexPattern',
                  {
                    defaultMessage: 'Index pattern',
                  }
                ),
              },
            ]}
            fixedPageSize={RESULTS_PER_PAGE}
            uiSettings={uiSettings}
            savedObjects={savedObjects}
          />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
