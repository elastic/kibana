/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, Fragment } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { useAppDependencies } from '../../../../app_dependencies';

interface DataSourceSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
  createNewDataView: () => void;
  canEditDataView: boolean;
}

type SavedObject = SavedObjectCommon<FinderAttributes & { isTextBasedQuery?: boolean }>;

const fixedPageSize: number = 8;

export const DataSourceSelection: FC<DataSourceSelectionProps> = ({
  onSearchSelected,
  createNewDataView,
  canEditDataView,
}) => {
  const { contentManagement, uiSettings } = useAppDependencies();

  return (
    <SavedObjectFinder
      id="transformWizardDataSourceSelection"
      key="transformWizardDataSourceSelection"
      onChoose={onSearchSelected}
      showFilter
      noItemsMessage={i18n.translate('xpack.transform.newTransform.searchSelection.notFoundLabel', {
        defaultMessage: 'No matching indices or saved Discover sessions found.',
      })}
      savedObjectMetaData={[
        {
          type: 'search',
          getIconForSavedObject: () => 'discoverApp',
          name: i18n.translate('xpack.transform.newTransform.searchSelection.savedObjectType.discoverSession', {
            defaultMessage: 'Discover session',
          }),
          showSavedObject: (savedObject: SavedObject) =>
            // ES|QL Based saved searches are not supported in transforms, filter them out
            savedObject.attributes.isTextBasedQuery !== true,
        },
        {
          type: 'index-pattern',
          getIconForSavedObject: () => 'indexPatternApp',
          name: i18n.translate('xpack.transform.newTransform.searchSelection.savedObjectType.dataView', {
            defaultMessage: 'Data view',
          }),
        },
      ]}
      fixedPageSize={fixedPageSize}
      services={{ contentClient: contentManagement.client, uiSettings }}
    >
      {canEditDataView ? (
        <EuiButton
          onClick={createNewDataView}
          iconType="plusInCircle"
          data-test-subj="transformWizardNewDataViewButton"
          disabled={!canEditDataView}
        >
          <FormattedMessage
            id="xpack.transform.newTransform.searchSelection.createADataView"
            defaultMessage="Create a data view"
          />
        </EuiButton>
      ) : (
        <Fragment />
      )}
    </SavedObjectFinder>
  );
};

