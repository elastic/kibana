/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, FunctionComponent, useEffect, useState } from 'react';
import moment from 'moment-timezone';

import { i18n } from '@kbn/i18n';

import d3 from 'd3';

import {
  EuiBadge,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

// TODO EUI's types for EuiInMemoryTable is missing these props
interface ExpandableTableProps extends EuiInMemoryTableProps {
  compressed: boolean;
}

const ExpandableTable = (EuiInMemoryTable as any) as FunctionComponent<ExpandableTableProps>;

import { useUiChromeContext } from '../../../../../contexts/ui/use_ui_chrome_context';

import { formatHumanReadableDateTimeSeconds } from '../../../../../util/date_utils';
import { ml } from '../../../../../services/ml_api_service';

import {
  toggleSelectedField,
  DataFrameAnalyticsOutlierConfig,
  EsFieldName,
  EsDoc,
  MAX_COLUMNS,
} from '../../../../common';

import { INDEX_STATUS, useExploreData } from './use_explore_data';

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsOutlierConfig[];
}

// Defining our own ENUM here.
// EUI's SortDirection wasn't usable as a union type
// required for the Sorting interface.
enum SORT_DIRECTON {
  ASC = 'asc',
  DESC = 'desc',
}

interface Sorting {
  sort: {
    field: string;
    direction: SORT_DIRECTON.ASC | SORT_DIRECTON.DESC;
  };
}

type TableSorting = Sorting | boolean;

const ExplorationTitle: React.SFC<{ jobId: string }> = ({ jobId }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.ml.dataframe.analytics.exploration.jobIdTitle', {
        defaultMessage: 'Job id {jobId}',
        values: { jobId },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  jobId: string;
}

export const Exploration: FC<Props> = React.memo(({ jobId }) => {
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsOutlierConfig | undefined>(
    undefined
  );

  useEffect(() => {
    (async function() {
      const analyticsConfigs: GetDataFrameAnalyticsResponse = await ml.dataFrameAnalytics.getDataFrameAnalytics(
        jobId
      );
      if (
        Array.isArray(analyticsConfigs.data_frame_analytics) &&
        analyticsConfigs.data_frame_analytics.length > 0
      ) {
        setJobConfig(analyticsConfigs.data_frame_analytics[0]);
      }
    })();
  }, []);

  const IS_DARK_THEME = useUiChromeContext()
    .getUiSettingsClient()
    .get('theme:darkMode');

  const range = IS_DARK_THEME
    ? [d3.rgb('#1d1e22'), d3.rgb('#4a8baf')]
    : [d3.rgb('#ffffff'), d3.rgb('#58b6ea')];
  const cellBgColor = d3.scale
    .linear()
    .domain([0, 1])
    // typings for .range() incorrectly don't allow passing in a color extent.
    // @ts-ignore
    .range(range);

  const [clearTable, setClearTable] = useState(false);

  const [selectedFields, setSelectedFields] = useState([] as EsFieldName[]);
  const [isColumnsPopoverVisible, setColumnsPopoverVisible] = useState(false);

  // EuiInMemoryTable has an issue with dynamic sortable columns
  // and will trigger a full page Kibana error in such a case.
  // The following is a workaround until this is solved upstream:
  // - If the sortable/columns config changes,
  //   the table will be unmounted/not rendered.
  //   This is what setClearTable(true) in toggleColumn() does.
  // - After that on next render it gets re-enabled. To make sure React
  //   doesn't consolidate the state updates, setTimeout is used.
  if (clearTable) {
    setTimeout(() => setClearTable(false), 0);
  }

  function toggleColumnsPopover() {
    setColumnsPopoverVisible(!isColumnsPopoverVisible);
  }

  function closeColumnsPopover() {
    setColumnsPopoverVisible(false);
  }

  function toggleColumn(column: EsFieldName) {
    // spread to a new array otherwise the component wouldn't re-render
    setClearTable(true);
    setSelectedFields([...toggleSelectedField(selectedFields, column)]);
  }

  const { errorMessage, status, tableItems } = useExploreData(
    jobConfig,
    selectedFields,
    setSelectedFields
  );

  if (jobConfig === undefined) {
    return null;
  }

  if (status === INDEX_STATUS.ERROR) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobConfig.id} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.indexError', {
            defaultMessage: 'An error occurred loading the index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <p>{errorMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (status === INDEX_STATUS.LOADED && tableItems.length === 0) {
    return (
      <EuiPanel grow={false}>
        <ExplorationTitle jobId={jobConfig.id} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.exploration.noDataCalloutTitle', {
            defaultMessage: 'Empty index query result.',
          })}
          color="primary"
        >
          <p>
            {i18n.translate('xpack.ml.dataframe.analytics.exploration.noDataCalloutBody', {
              defaultMessage:
                'The query for the index returned no results. Please make sure the index contains documents and your query is not too restrictive.',
            })}
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  let docFields: EsFieldName[] = [];
  let docFieldsCount = 0;
  if (tableItems.length > 0) {
    docFields = Object.keys(tableItems[0]._source);
    docFields.sort();
    docFieldsCount = docFields.length;
  }

  const columns = selectedFields.map(k => {
    const column = {
      field: `_source["${k}"]`,
      name: k,
      sortable: true,
      truncateText: true,
    } as Record<string, any>;

    const render = (d: any, fullItem: EsDoc) => {
      if (Array.isArray(d) && d.every(item => typeof item === 'string')) {
        // If the cells data is an array of strings, return as a comma separated list.
        // The list will get limited to 5 items with `…` at the end if there's more in the original array.
        return `${d.slice(0, 5).join(', ')}${d.length > 5 ? ', …' : ''}`;
      } else if (Array.isArray(d)) {
        // If the cells data is an array of e.g. objects, display a 'array' badge with a
        // tooltip that explains that this type of field is not supported in this table.
        return (
          <EuiToolTip
            content={i18n.translate(
              'xpack.ml.dataframe.analytics.exploration.indexArrayToolTipContent',
              {
                defaultMessage: 'The full content of this array based column cannot be displayed.',
              }
            )}
          >
            <EuiBadge>
              {i18n.translate('xpack.ml.dataframe.analytics.exploration.indexArrayBadgeContent', {
                defaultMessage: 'array',
              })}
            </EuiBadge>
          </EuiToolTip>
        );
      } else if (typeof d === 'object' && d !== null) {
        // If the cells data is an object, display a 'object' badge with a
        // tooltip that explains that this type of field is not supported in this table.
        return (
          <EuiToolTip
            content={i18n.translate(
              'xpack.ml.dataframe.analytics.exploration.indexObjectToolTipContent',
              {
                defaultMessage: 'The full content of this object based column cannot be displayed.',
              }
            )}
          >
            <EuiBadge>
              {i18n.translate('xpack.ml.dataframe.analytics.exploration.indexObjectBadgeContent', {
                defaultMessage: 'object',
              })}
            </EuiBadge>
          </EuiToolTip>
        );
      }

      const split = k.split('.');
      let backgroundColor;
      const color = undefined;
      const resultsField = jobConfig.dest.results_field;

      if (fullItem._source[`${resultsField}.feature_influence.${k}`] !== undefined) {
        backgroundColor = cellBgColor(fullItem._source[`${resultsField}.feature_influence.${k}`]);
      }

      if (split[0] === resultsField) {
        backgroundColor = cellBgColor(d);
      }

      return (
        <div
          className="mlColoredTableCell"
          style={{
            backgroundColor,
            color,
          }}
        >
          {d}
        </div>
      );
    };

    let columnType;

    if (tableItems.length > 0) {
      columnType = typeof tableItems[0]._source[k];
    }

    if (typeof columnType !== 'undefined') {
      switch (columnType) {
        case 'boolean':
          column.dataType = 'boolean';
          break;
        case 'Date':
          column.align = 'right';
          column.render = (d: any) => formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000);
          break;
        case 'number':
          column.dataType = 'number';
          column.render = render;
          break;
        default:
          column.render = render;
          break;
      }
    } else {
      column.render = render;
    }

    return column;
  });

  let sorting: TableSorting = false;

  if (columns.length > 0) {
    sorting = {
      sort: {
        field: columns[0].field,
        direction: SORT_DIRECTON.ASC,
      },
    };
  }

  return (
    <EuiPanel grow={false}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <ExplorationTitle jobId={jobConfig.id} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem>
              {docFieldsCount > MAX_COLUMNS && (
                <EuiText size="s">
                  {i18n.translate('xpack.ml.dataframe.analytics.exploration.fieldSelection', {
                    defaultMessage:
                      'showing {selectedFieldsLength, number} of {docFieldsCount, number} {docFieldsCount, plural, one {field} other {fields}}',
                    values: { selectedFieldsLength: selectedFields.length, docFieldsCount },
                  })}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <EuiPopover
                  id="popover"
                  button={
                    <EuiButtonIcon
                      iconType="gear"
                      onClick={toggleColumnsPopover}
                      aria-label={i18n.translate(
                        'xpack.ml.dataframe.analytics.exploration.selectColumnsAriaLabel',
                        {
                          defaultMessage: 'Select columns',
                        }
                      )}
                    />
                  }
                  isOpen={isColumnsPopoverVisible}
                  closePopover={closeColumnsPopover}
                  ownFocus
                >
                  <EuiPopoverTitle>
                    {i18n.translate(
                      'xpack.ml.dataframe.analytics.exploration.selectFieldsPopoverTitle',
                      {
                        defaultMessage: 'Select fields',
                      }
                    )}
                  </EuiPopoverTitle>
                  <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
                    {docFields.map(d => (
                      <EuiCheckbox
                        key={d}
                        id={d}
                        label={d}
                        checked={selectedFields.includes(d)}
                        onChange={() => toggleColumn(d)}
                        disabled={selectedFields.includes(d) && selectedFields.length === 1}
                      />
                    ))}
                  </div>
                </EuiPopover>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {status === INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== INDEX_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {clearTable === false && columns.length > 0 && (
        <ExpandableTable
          className="mlDataFrameAnalyticsExploration"
          columns={columns}
          compressed
          hasActions={false}
          isSelectable={false}
          items={tableItems}
          pagination={{
            initialPageSize: 25,
            pageSizeOptions: [5, 10, 25, 50],
          }}
          sorting={sorting}
        />
      )}
    </EuiPanel>
  );
});
