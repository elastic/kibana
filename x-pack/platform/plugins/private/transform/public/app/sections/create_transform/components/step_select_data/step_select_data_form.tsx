/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, Fragment, useCallback, useEffect, useRef } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';

import { useAppDependencies } from '../../../../app_dependencies';

interface StepSelectDataFormProps {
  searchItemsError?: string;
  onSavedObjectSelected: (id: string) => void;
}

type SavedObject = SavedObjectCommon<FinderAttributes & { isTextBasedQuery?: boolean }>;

const fixedPageSize: number = 8;

export const StepSelectDataForm: FC<StepSelectDataFormProps> = ({
  searchItemsError,
  onSavedObjectSelected,
}) => {
  const { contentManagement, uiSettings, dataViewEditor } = useAppDependencies();

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());
  const closeDataViewEditorRef = useRef<undefined | (() => void)>();

  useEffect(function cleanUpDataViewEditorFlyout() {
    return () => {
      if (closeDataViewEditorRef.current) {
        closeDataViewEditorRef.current();
      }
    };
  }, []);

  const createNewDataView = useCallback(() => {
    closeDataViewEditorRef.current = dataViewEditor?.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          onSavedObjectSelected(dataView.id);
        }
      },
      allowAdHocDataView: true,
    });
  }, [dataViewEditor, onSavedObjectSelected]);

  const onChoose = useCallback(
    (id: string) => {
      onSavedObjectSelected(id);
    },
    [onSavedObjectSelected]
  );

  return (
    <div data-test-subj="transformStepSelectDataForm">
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.transform.stepSelectDataForm.description', {
            defaultMessage: 'Choose a Kibana data view or a saved Discover session as the source.',
          })}
        </p>
      </EuiText>

      {searchItemsError !== undefined && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            title={searchItemsError}
            color="danger"
            iconType="warning"
            data-test-subj="transformStepSelectDataError"
          />
        </>
      )}

      <EuiSpacer size="m" />

      <SavedObjectFinder
        id="transformCreateWizardSearchSelection"
        key="searchSavedObjectFinder"
        onChoose={onChoose}
        showFilter
        noItemsMessage={i18n.translate('xpack.transform.stepSelectDataForm.notFoundLabel', {
          defaultMessage: 'No matching data views or saved Discover sessions found.',
        })}
        savedObjectMetaData={[
          {
            type: 'search',
            getIconForSavedObject: () => 'discoverApp',
            name: i18n.translate(
              'xpack.transform.stepSelectDataForm.savedObjectType.discoverSession',
              {
                defaultMessage: 'Discover session',
              }
            ),
            showSavedObject: (savedObject: SavedObject) =>
              // ES|QL based saved searches are not supported in transforms, filter them out
              savedObject.attributes.isTextBasedQuery !== true,
          },
          {
            type: 'index-pattern',
            getIconForSavedObject: () => 'indexPatternApp',
            name: i18n.translate('xpack.transform.stepSelectDataForm.savedObjectType.dataView', {
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
            data-test-subj="transformStepSelectDataCreateDataViewButton"
            disabled={!canEditDataView}
          >
            {i18n.translate('xpack.transform.stepSelectDataForm.createDataViewButton', {
              defaultMessage: 'Create a data view',
            })}
          </EuiButton>
        ) : (
          <Fragment />
        )}
      </SavedObjectFinder>
    </div>
  );
};
