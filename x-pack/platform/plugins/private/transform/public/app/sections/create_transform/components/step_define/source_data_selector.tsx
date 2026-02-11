/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, Fragment, useMemo, useState } from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';

import { useAppDependencies } from '../../../../app_dependencies';
import type { SearchItems } from '../../../../hooks/use_search_items';

type SavedObject = SavedObjectCommon<FinderAttributes & { isTextBasedQuery?: boolean }>;

const fixedPageSize: number = 8;

export interface SourceDataSelectorProps {
  searchItems?: SearchItems;
  onSelectSavedObjectId?: (savedObjectId: string) => void;
}

export const SourceDataSelector: FC<SourceDataSelectorProps> = React.memo(
  ({ searchItems, onSelectSavedObjectId }) => {
    const { contentManagement, uiSettings, dataViewEditor } = useAppDependencies();

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const isDisabled = onSelectSavedObjectId === undefined;

    const selectedSourceLabel = useMemo(() => {
      if (searchItems?.savedSearch?.id) {
        return (
          (searchItems.savedSearch.title as string | undefined) ??
          i18n.translate('xpack.transform.sourceDataSelector.discoverSessionFallbackTitle', {
            defaultMessage: 'Discover session',
          })
        );
      }

      if (searchItems?.dataView) {
        return searchItems.dataView.getIndexPattern();
      }

      return i18n.translate('xpack.transform.sourceDataSelector.selectSourceLabel', {
        defaultMessage: 'Select a source',
      });
    }, [searchItems?.dataView, searchItems?.savedSearch?.id, searchItems?.savedSearch?.title]);

    const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

    const createNewDataView = () => {
      if (!dataViewEditor) return;
      setIsPopoverOpen(false);
      dataViewEditor.openEditor({
        onSave: async (createdDataView) => {
          if (createdDataView.id) {
            onSelectSavedObjectId?.(createdDataView.id);
          }
        },
        allowAdHocDataView: true,
      });
    };

    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.transform.sourceDataSelector.selectDataSourceLabel', {
          defaultMessage: 'Select data source',
        })}
      >
        <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiPopover
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="s"
              button={
                <EuiButtonEmpty
                  flush="left"
                  iconType="arrowDown"
                  iconSide="right"
                  onClick={() => setIsPopoverOpen((v) => !v)}
                  isDisabled={isDisabled}
                  data-test-subj="transformSourceDataSelectorButton"
                >
                  {selectedSourceLabel}
                </EuiButtonEmpty>
              }
            >
              <EuiPopoverTitle>
                {i18n.translate('xpack.transform.sourceDataSelector.popoverTitle', {
                  defaultMessage: 'Choose a source',
                })}
              </EuiPopoverTitle>

              <SavedObjectFinder
                id="transformWizardSourceFinder"
                key="transformWizardSourceFinder"
                onChoose={(id: string) => {
                  setIsPopoverOpen(false);
                  onSelectSavedObjectId?.(id);
                }}
                showFilter
                noItemsMessage={i18n.translate(
                  'xpack.transform.sourceDataSelector.notFoundLabel',
                  {
                    defaultMessage: 'No matching indices or saved Discover sessions found.',
                  }
                )}
                savedObjectMetaData={[
                  {
                    type: 'search',
                    getIconForSavedObject: () => 'discoverApp',
                    name: i18n.translate(
                      'xpack.transform.sourceDataSelector.savedObjectType.discoverSession',
                      {
                        defaultMessage: 'Discover session',
                      }
                    ),
                    showSavedObject: (savedObject: SavedObject) =>
                      // ES|QL based saved searches are not supported in transforms
                      savedObject.attributes.isTextBasedQuery !== true,
                  },
                  {
                    type: 'index-pattern',
                    getIconForSavedObject: () => 'indexPatternApp',
                    name: i18n.translate(
                      'xpack.transform.sourceDataSelector.savedObjectType.dataView',
                      {
                        defaultMessage: 'Data view',
                      }
                    ),
                  },
                ]}
                fixedPageSize={fixedPageSize}
                services={{ contentClient: contentManagement.client, uiSettings }}
              >
                {canEditDataView ? (
                  <EuiButtonEmpty
                    onClick={createNewDataView}
                    iconType="plusInCircle"
                    data-test-subj="transformSourceDataSelectorCreateDataViewButton"
                    disabled={!canEditDataView}
                  >
                    {i18n.translate('xpack.transform.sourceDataSelector.createDataViewLabel', {
                      defaultMessage: 'Create a data view',
                    })}
                  </EuiButtonEmpty>
                ) : (
                  <Fragment />
                )}
              </SavedObjectFinder>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);

