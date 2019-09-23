/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  ColumnType,
  MlInMemoryTableBasic,
  SORT_DIRECTION,
} from '../../../../../components/ml_in_memory_table';
import { dictionaryToArray } from '../../../../../../common/types/common';
import { ES_FIELD_TYPES } from '../../../../../../common/constants/field_types';
import { formatHumanReadableDateTimeSeconds } from '../../../../../util/date_utils';

import { useCurrentIndexPattern } from '../../../../../contexts/kibana';

import {
  getFlattenedFields,
  PreviewRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotQuery,
} from '../../../../common';

import { getPivotPreviewDevConsoleStatement } from './common';
import { PIVOT_PREVIEW_STATUS, usePivotPreviewData } from './use_pivot_preview_data';

function sortColumns(groupByArr: PivotGroupByConfig[]) {
  return (a: string, b: string) => {
    // make sure groupBy fields are always most left columns
    if (groupByArr.some(d => d.aggName === a) && groupByArr.some(d => d.aggName === b)) {
      return a.localeCompare(b);
    }
    if (groupByArr.some(d => d.aggName === a)) {
      return -1;
    }
    if (groupByArr.some(d => d.aggName === b)) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

function usePrevious(value: any) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

interface PreviewTitleProps {
  previewRequest: PreviewRequestBody;
}

const PreviewTitle: SFC<PreviewTitleProps> = ({ previewRequest }) => {
  const euiCopyText = i18n.translate('xpack.ml.dataframe.pivotPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <span>
            {i18n.translate('xpack.ml.dataframe.pivotPreview.dataFramePivotPreviewTitle', {
              defaultMessage: 'Data frame pivot preview',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy
          beforeMessage={euiCopyText}
          textToCopy={getPivotPreviewDevConsoleStatement(previewRequest)}
        >
          {(copy: () => void) => (
            <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: SFC<ErrorMessageProps> = ({ message }) => {
  const error = JSON.parse(message);

  const statusCodeLabel = i18n.translate('xpack.ml.dataframe.pivotPreview.statusCodeLabel', {
    defaultMessage: 'Status code',
  });

  return (
    <EuiText size="xs">
      <pre>
        {(error.message &&
          error.statusCode &&
          `${statusCodeLabel}: ${error.statusCode}\n${error.message}`) ||
          message}
      </pre>
    </EuiText>
  );
};

interface PivotPreviewProps {
  aggs: PivotAggsConfigDict;
  groupBy: PivotGroupByConfigDict;
  query: PivotQuery;
}

export const PivotPreview: SFC<PivotPreviewProps> = React.memo(({ aggs, groupBy, query }) => {
  const [clearTable, setClearTable] = useState(false);

  const indexPattern = useCurrentIndexPattern();

  const {
    dataFramePreviewData,
    dataFramePreviewMappings,
    errorMessage,
    previewRequest,
    status,
  } = usePivotPreviewData(indexPattern, query, aggs, groupBy);

  const groupByArr = dictionaryToArray(groupBy);

  // EuiInMemoryTable has an issue with dynamic sortable columns
  // and will trigger a full page Kibana error in such a case.
  // The following is a workaround until this is solved upstream:
  // - If the sortable/columns config changes,
  //   the table will be unmounted/not rendered.
  //   This is what the useEffect() part does.
  // - After that the table gets re-enabled. To make sure React
  //   doesn't consolidate the state updates, setTimeout is used.
  const firstColumnName =
    dataFramePreviewData.length > 0
      ? Object.keys(dataFramePreviewData[0]).sort(sortColumns(groupByArr))[0]
      : undefined;

  const firstColumnNameChanged = usePrevious(firstColumnName) !== firstColumnName;
  useEffect(() => {
    if (firstColumnNameChanged) {
      setClearTable(true);
    }
    if (clearTable) {
      setTimeout(() => setClearTable(false), 0);
    }
  });

  if (firstColumnNameChanged) {
    return null;
  }

  if (status === PIVOT_PREVIEW_STATUS.ERROR) {
    return (
      <EuiPanel grow={false}>
        <PreviewTitle previewRequest={previewRequest} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.pivotPreview.dataFramePivotPreviewError', {
            defaultMessage: 'An error occurred loading the pivot preview.',
          })}
          color="danger"
          iconType="cross"
        >
          <ErrorMessage message={errorMessage} />
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (dataFramePreviewData.length === 0) {
    let noDataMessage = i18n.translate(
      'xpack.ml.dataframe.pivotPreview.dataFramePivotPreviewNoDataCalloutBody',
      {
        defaultMessage:
          'The preview request did not return any data. Please ensure the optional query returns data and that values exist for the field used by group-by and aggregation fields.',
      }
    );

    const aggsArr = dictionaryToArray(aggs);
    if (aggsArr.length === 0 || groupByArr.length === 0) {
      noDataMessage = i18n.translate(
        'xpack.ml.dataframe.pivotPreview.dataFramePivotPreviewIncompleteConfigCalloutBody',
        {
          defaultMessage: 'Please choose at least one group-by field and aggregation.',
        }
      );
    }
    return (
      <EuiPanel grow={false}>
        <PreviewTitle previewRequest={previewRequest} />
        <EuiCallOut
          title={i18n.translate(
            'xpack.ml.dataframe.pivotPreview.dataFramePivotPreviewNoDataCalloutTitle',
            {
              defaultMessage: 'Pivot preview not available',
            }
          )}
          color="primary"
        >
          <p>{noDataMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  const columnKeys = getFlattenedFields(dataFramePreviewData[0]);
  columnKeys.sort(sortColumns(groupByArr));

  const columns = columnKeys.map(k => {
    const column: ColumnType = {
      field: k,
      name: k,
      sortable: true,
      truncateText: true,
    };
    if (typeof dataFramePreviewMappings.properties[k] !== 'undefined') {
      const esFieldType = dataFramePreviewMappings.properties[k].type;
      switch (esFieldType) {
        case ES_FIELD_TYPES.BOOLEAN:
          column.dataType = 'boolean';
          break;
        case ES_FIELD_TYPES.DATE:
          column.align = 'right';
          column.render = (d: any) => formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000);
          break;
        case ES_FIELD_TYPES.BYTE:
        case ES_FIELD_TYPES.DOUBLE:
        case ES_FIELD_TYPES.FLOAT:
        case ES_FIELD_TYPES.HALF_FLOAT:
        case ES_FIELD_TYPES.INTEGER:
        case ES_FIELD_TYPES.LONG:
        case ES_FIELD_TYPES.SCALED_FLOAT:
        case ES_FIELD_TYPES.SHORT:
          column.dataType = 'number';
          break;
        case ES_FIELD_TYPES.KEYWORD:
        case ES_FIELD_TYPES.TEXT:
          column.dataType = 'string';
          break;
      }
    }
    return column;
  });

  if (columns.length === 0) {
    return null;
  }

  const sorting = {
    sort: {
      field: columns[0].field,
      direction: SORT_DIRECTION.ASC,
    },
  };

  return (
    <EuiPanel>
      <PreviewTitle previewRequest={previewRequest} />
      {status === PIVOT_PREVIEW_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== PIVOT_PREVIEW_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {dataFramePreviewData.length > 0 && clearTable === false && columns.length > 0 && (
        <MlInMemoryTableBasic
          allowNeutralSort={false}
          compressed
          items={dataFramePreviewData}
          columns={columns}
          pagination={{
            initialPageSize: 5,
            pageSizeOptions: [5, 10, 25],
          }}
          sorting={sorting}
        />
      )}
    </EuiPanel>
  );
});
