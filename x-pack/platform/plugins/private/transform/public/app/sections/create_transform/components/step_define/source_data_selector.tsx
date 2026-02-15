/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useState } from 'react';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
  EuiModal,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useAppDependencies } from '../../../../app_dependencies';
import { getIndexDevConsoleStatement } from '../../../../common/data_grid';
import { getTransformConfigQuery } from '../../../../common/request';
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

    const isDiscoverSessionSelected = Boolean(searchItems?.savedSearch?.id);

    const copyToClipboardSourceDescription = useMemo(
      () =>
        i18n.translate('xpack.transform.indexPreview.copyClipboardTooltip', {
          defaultMessage: 'Copy Dev Console statement of the index preview to the clipboard.',
        }),
      []
    );

    const copyToClipboardSource = useMemo(() => {
      if (!isDiscoverSessionSelected || !searchItems?.dataView || !searchItems?.combinedQuery) {
        return '';
      }

      const transformConfigQuery = getTransformConfigQuery(searchItems.combinedQuery);
      return getIndexDevConsoleStatement(
        transformConfigQuery,
        searchItems.dataView.getIndexPattern()
      );
    }, [isDiscoverSessionSelected, searchItems?.combinedQuery, searchItems?.dataView]);

    const fieldPrependLabel = useMemo(() => {
      return isDiscoverSessionSelected
        ? i18n.translate('xpack.transform.sourceDataSelector.discoverSessionPrependLabel', {
            defaultMessage: 'Discover session',
          })
        : i18n.translate('xpack.transform.sourceDataSelector.dataViewPrependLabel', {
            defaultMessage: 'Data view',
          });
    }, [isDiscoverSessionSelected]);

    const selectedSourceValue = useMemo(() => {
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

      return '';
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
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiFormControlLayout
                fullWidth
                compressed
                prepend={fieldPrependLabel}
                css={css`
                  cursor: pointer;
                `}
              >
                <EuiFieldText
                  fullWidth
                  compressed
                  readOnly
                  value={selectedSourceValue}
                  placeholder={i18n.translate(
                    'xpack.transform.sourceDataSelector.selectSourceLabel',
                    {
                      defaultMessage: 'Select a source',
                    }
                  )}
                  onClick={() => {
                    if (!isDisabled) {
                      setIsModalOpen(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (isDisabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsModalOpen(true);
                    }
                  }}
                  aria-label={i18n.translate('xpack.transform.sourceDataSelector.fieldAriaLabel', {
                    defaultMessage: 'Select data source',
                  })}
                  data-test-subj="transformSourceDataSelectorButton"
                />
              </EuiFormControlLayout>
            </EuiFlexItem>

            {isDiscoverSessionSelected && copyToClipboardSource && (
              <EuiFlexItem grow={false}>
                <EuiCopy
                  beforeMessage={copyToClipboardSourceDescription}
                  textToCopy={copyToClipboardSource}
                >
                  {(copy: () => void) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      aria-label={copyToClipboardSourceDescription}
                      data-test-subj="transformDiscoverSessionCopyDevConsoleStatementButton"
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          {isModalOpen && (
            <EuiModal
              onClose={() => setIsModalOpen(false)}
              css={styles.dialog}
              aria-label={i18n.translate('xpack.transform.sourceDataSelector.modalAriaLabel', {
                defaultMessage: 'Choose a source',
              })}
              data-test-subj="transformSelectSourceModal"
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
