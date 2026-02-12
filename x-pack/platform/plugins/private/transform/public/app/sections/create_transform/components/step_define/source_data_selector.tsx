/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useState } from 'react';

import { EuiButtonEmpty, EuiFormRow, EuiModal, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useAppDependencies } from '../../../../app_dependencies';
import type { SearchItems } from '../../../../hooks/use_search_items';
import { SearchSelection } from '../../../transform_management/components/search_selection';

export interface SourceDataSelectorProps {
  searchItems?: SearchItems;
  onSelectSavedObjectId?: (savedObjectId: string) => void;
}

export const SourceDataSelector: FC<SourceDataSelectorProps> = React.memo(
  ({ searchItems, onSelectSavedObjectId }) => {
    const { dataViewEditor } = useAppDependencies();

    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const useStyles = () => {
      const { euiTheme } = useEuiTheme();

      return {
        dialog: css`
          width: calc(${euiTheme.size.l} * 30);
          min-height: calc(${euiTheme.size.l} * 25);
        `,
      };
    };

    const styles = useStyles();

    const createNewDataView = () => {
      if (!dataViewEditor) return;
      setIsModalOpen(false);
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
        <>
          <EuiButtonEmpty
            flush="left"
            iconType="arrowDown"
            iconSide="right"
            onClick={() => setIsModalOpen(true)}
            isDisabled={isDisabled}
            data-test-subj="transformSourceDataSelectorButton"
          >
            {selectedSourceLabel}
          </EuiButtonEmpty>

          {isModalOpen && (
            <EuiModal
              onClose={() => setIsModalOpen(false)}
              css={styles.dialog}
              aria-label={i18n.translate('xpack.transform.sourceDataSelector.modalAriaLabel', {
                defaultMessage: 'Choose a source',
              })}
              data-test-subj="transformSourceDataSelectorModal"
            >
              <SearchSelection
                onSearchSelected={(id: string) => {
                  setIsModalOpen(false);
                  onSelectSavedObjectId?.(id);
                }}
                canEditDataView={canEditDataView}
                createNewDataView={createNewDataView}
              />
            </EuiModal>
          )}
        </>
      </EuiFormRow>
    );
  }
);
