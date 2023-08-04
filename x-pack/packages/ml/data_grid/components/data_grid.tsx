/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { memo, useEffect, useRef, FC } from 'react';
import { css } from '@emotion/react';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiDataGrid,
  EuiDataGridCellPopoverElementProps,
  EuiDataGridProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMutationObserver,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CoreSetup } from '@kbn/core/public';
import { DEFAULT_SAMPLER_SHARD_SIZE } from '@kbn/ml-agg-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import { euiDataGridStyle, euiDataGridToolbarSettings, INDEX_STATUS } from '../lib/common';
import { UseIndexDataReturnType } from '../lib/types';

const cssOverride = css({
  '.euiDataGridRowCell--boolean': { textTransform: 'none' },
  // Overrides to align the sorting arrow, actions icon and the column header when no chart is available,
  // to the bottom of the cell when histogram charts are enabled.
  // Note that overrides have to be used as currently it is not possible to add a custom class name
  // for the EuiDataGridHeaderCell - see https://github.com/elastic/eui/issues/5106
  '.euiDataGridHeaderCell': {
    '.euiDataGridHeaderCell__sortingArrow,.euiDataGridHeaderCell__icon,.euiPopover': {
      marginTop: 'auto',
    },
  },
});

export const DataGridTitle: FC<{ title: string }> = ({ title }) => (
  <EuiTitle size="xs">
    <span>{title}</span>
  </EuiTitle>
);

interface PropsWithoutHeader extends UseIndexDataReturnType {
  dataTestSubj: string;
  renderCellPopover?: (popoverProps: EuiDataGridCellPopoverElementProps) => JSX.Element;
  toastNotifications: CoreSetup['notifications']['toasts'];
  trailingControlColumns?: EuiDataGridProps['trailingControlColumns'];
}

interface PropsWithHeader extends PropsWithoutHeader {
  copyToClipboard: string;
  copyToClipboardDescription: string;
  title: string;
}

function isWithHeader(arg: unknown): arg is PropsWithHeader {
  return isPopulatedObject(arg, ['title']) && typeof arg.title === 'string' && arg.title !== '';
}

type Props = PropsWithHeader | PropsWithoutHeader;

/**
 * Custom data grid component with support for mini histograms.
 */
export const DataGrid: FC<Props> = memo(
  (props) => {
    const {
      chartsVisible,
      chartsButtonVisible,
      ccsWarning,
      columnsWithCharts,
      dataTestSubj,
      errorMessage,
      invalidSortingColumnns,
      noDataMessage,
      onChangeItemsPerPage,
      onChangePage,
      onSort,
      pagination,
      setVisibleColumns,
      renderCellPopover,
      renderCellValue,
      rowCount,
      sortingColumns,
      status,
      tableItems: data,
      toastNotifications,
      toggleChartVisibility,
      visibleColumns,
      trailingControlColumns,
    } = props;

    useEffect(() => {
      if (invalidSortingColumnns.length > 0) {
        invalidSortingColumnns.forEach((columnId) => {
          toastNotifications.addDanger(
            i18n.translate('xpack.ml.dataGrid.invalidSortingColumnError', {
              defaultMessage: `The column '{columnId}' cannot be used for sorting.`,
              values: { columnId },
            })
          );
        });
      }
    }, [invalidSortingColumnns, toastNotifications]);

    const wrapperEl = useRef<HTMLDivElement>(null);

    if (status === INDEX_STATUS.LOADED && data.length === 0) {
      return (
        <div data-test-subj={`${dataTestSubj} empty`}>
          {isWithHeader(props) && <DataGridTitle title={props.title} />}
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutTitle', {
              defaultMessage: 'Empty index query result.',
            })}
            color="primary"
          >
            <p>
              {i18n.translate('xpack.ml.dataGrid.IndexNoDataCalloutBody', {
                defaultMessage:
                  'The query for the index returned no results. Please make sure you have sufficient permissions, the index contains documents and your query is not too restrictive.',
              })}
            </p>
          </EuiCallOut>
        </div>
      );
    }

    if (noDataMessage !== '') {
      return (
        <div data-test-subj={`${dataTestSubj} empty`}>
          {isWithHeader(props) && <DataGridTitle title={props.title} />}
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.dataGridNoDataCalloutTitle', {
              defaultMessage: 'Index preview not available',
            })}
            color="primary"
          >
            <p>{noDataMessage}</p>
          </EuiCallOut>
        </div>
      );
    }

    let errorCallout;

    if (status === INDEX_STATUS.ERROR) {
      // if it's a searchBar syntax error leave the table visible so they can try again
      if (errorMessage && !errorMessage.includes('failed to create query')) {
        errorCallout = (
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataframe.analytics.exploration.querySyntaxError', {
              defaultMessage:
                'An error occurred loading the index data. Please ensure your query syntax is valid.',
            })}
            color="danger"
            iconType="cross"
          >
            <p>{errorMessage}</p>
          </EuiCallOut>
        );
      } else {
        errorCallout = (
          <EuiCallOut
            title={i18n.translate('xpack.ml.dataGrid.indexDataError', {
              defaultMessage: 'An error occurred loading the index data.',
            })}
            color="danger"
            iconType="cross"
          >
            <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
              {errorMessage}
            </EuiCodeBlock>
          </EuiCallOut>
        );
      }
    }

    const onMutation = () => {
      if (wrapperEl.current !== null) {
        const els = wrapperEl.current.querySelectorAll('.euiDataGrid__virtualized');
        for (const el of Array.from(els)) {
          if (isPopulatedObject(el) && isPopulatedObject(el.style) && el.style.height !== 'auto') {
            el.style.height = 'auto';
          }
        }
      }
    };

    return (
      <div
        data-test-subj={`${dataTestSubj} ${status === INDEX_STATUS.ERROR ? 'error' : 'loaded'}`}
        ref={wrapperEl}
      >
        {isWithHeader(props) && (
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <DataGridTitle title={props.title} />
            </EuiFlexItem>
            {props.copyToClipboard && props.copyToClipboardDescription && (
              <EuiFlexItem grow={false}>
                <EuiCopy
                  beforeMessage={props.copyToClipboardDescription}
                  textToCopy={props.copyToClipboard}
                >
                  {(copy: () => void) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      aria-label={props.copyToClipboardDescription}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        )}
        {errorCallout !== undefined && (
          <div data-test-subj={`${dataTestSubj} error`}>
            {errorCallout}
            <EuiSpacer size="m" />
          </div>
        )}
        {ccsWarning && (
          <div data-test-subj={`${dataTestSubj} ccsWarning`}>
            <EuiCallOut
              title={i18n.translate('xpack.ml.dataGrid.CcsWarningCalloutTitle', {
                defaultMessage: 'Cross-cluster search returned no fields data.',
              })}
              color="warning"
            >
              <p>
                {i18n.translate('xpack.ml.dataGrid.CcsWarningCalloutBody', {
                  defaultMessage:
                    'There was an issue retrieving data for the data view. Source preview in combination with cross-cluster search is only supported for versions 7.10 and above. You may still configure and create the transform.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </div>
        )}
        {rowCount > 0 && (
          <EuiMutationObserver
            observerOptions={{ subtree: true, attributes: true, childList: true }}
            onMutation={onMutation}
          >
            {(mutationRef) => (
              <div css={cssOverride} ref={mutationRef}>
                <EuiDataGrid
                  aria-label={isWithHeader(props) ? props.title : ''}
                  columns={columnsWithCharts.map((c) => {
                    c.initialWidth = 165;
                    return c;
                  })}
                  columnVisibility={{ visibleColumns, setVisibleColumns }}
                  trailingControlColumns={trailingControlColumns}
                  gridStyle={euiDataGridStyle}
                  rowCount={rowCount}
                  renderCellValue={renderCellValue}
                  renderCellPopover={renderCellPopover}
                  sorting={{ columns: sortingColumns, onSort }}
                  toolbarVisibility={{
                    ...euiDataGridToolbarSettings,
                    ...(chartsButtonVisible
                      ? {
                          additionalControls: (
                            <EuiToolTip
                              content={i18n.translate(
                                'xpack.ml.dataGrid.histogramButtonToolTipContent',
                                {
                                  defaultMessage:
                                    'Queries run to fetch histogram chart data will use a sample size per shard of {samplerShardSize} documents.',
                                  values: {
                                    samplerShardSize: DEFAULT_SAMPLER_SHARD_SIZE,
                                  },
                                }
                              )}
                            >
                              <EuiButtonEmpty
                                aria-pressed={chartsVisible === true}
                                className={`euiDataGrid__controlBtn${
                                  chartsVisible === true ? ' euiDataGrid__controlBtn--active' : ''
                                }`}
                                data-test-subj={`${dataTestSubj}HistogramButton`}
                                size="xs"
                                iconType="visBarVertical"
                                color="text"
                                onClick={toggleChartVisibility}
                                disabled={chartsVisible === undefined}
                              >
                                <FormattedMessage
                                  id="xpack.ml.dataGrid.histogramButtonText"
                                  defaultMessage="Histogram charts"
                                />
                              </EuiButtonEmpty>
                            </EuiToolTip>
                          ),
                        }
                      : {}),
                  }}
                  pagination={{
                    ...pagination,
                    pageSizeOptions: [5, 10, 25],
                    onChangeItemsPerPage,
                    onChangePage,
                  }}
                />
              </div>
            )}
          </EuiMutationObserver>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: Props) {
  return [
    props.columnsWithCharts,
    props.dataTestSubj,
    props.errorMessage,
    props.invalidSortingColumnns,
    props.noDataMessage,
    props.pagination,
    props.rowCount,
    props.sortingColumns,
    props.status,
    props.tableItems,
    props.visibleColumns,
    ...(isWithHeader(props)
      ? [props.copyToClipboard, props.copyToClipboardDescription, props.title]
      : []),
  ];
}
