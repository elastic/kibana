/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useRef, useState } from 'react';
import moment from 'moment-timezone';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiTitle,
} from '@elastic/eui';

import {
  ColumnType,
  mlInMemoryTableBasicFactory,
  SORT_DIRECTION,
} from '../../../../../shared_imports';
import { dictionaryToArray } from '../../../../../../common/types/common';
import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
import { formatHumanReadableDateTimeSeconds } from '../../../../../../common/utils/date_utils';

import { useCurrentIndexPattern } from '../../../../lib/kibana';

import {
  getFlattenedFields,
  PreviewRequestBody,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotQuery,
} from '../../../../common';

import { getPivotPreviewDevConsoleStatement } from './common';
import { PreviewItem, PIVOT_PREVIEW_STATUS, usePivotPreviewData } from './use_pivot_preview_data';

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

const PreviewTitle: FC<PreviewTitleProps> = ({ previewRequest }) => {
  const euiCopyText = i18n.translate('xpack.transform.pivotPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
  });

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <span>
            {i18n.translate('xpack.transform.pivotPreview.PivotPreviewTitle', {
              defaultMessage: 'Transform pivot preview',
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

const ErrorMessage: FC<ErrorMessageProps> = ({ message }) => (
  <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
    {message}
  </EuiCodeBlock>
);

interface PivotPreviewProps {
  aggs: PivotAggsConfigDict;
  groupBy: PivotGroupByConfigDict;
  query: PivotQuery;
}

export const PivotPreview: FC<PivotPreviewProps> = React.memo(({ aggs, groupBy, query }) => {
  const [clearTable, setClearTable] = useState(false);

  const indexPattern = useCurrentIndexPattern();

  const {
    previewData,
    previewMappings,
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
    previewData.length > 0
      ? Object.keys(previewData[0]).sort(sortColumns(groupByArr))[0]
      : undefined;

  const firstColumnNameChanged = usePrevious(firstColumnName) !== firstColumnName;
  useEffect(() => {
    if (firstColumnNameChanged) {
      setClearTable(true);
    }
    if (clearTable) {
      setTimeout(() => setClearTable(false), 0);
    }
  }, [firstColumnNameChanged, clearTable]);

  if (firstColumnNameChanged) {
    return null;
  }

  if (status === PIVOT_PREVIEW_STATUS.ERROR) {
    return (
      <EuiPanel grow={false} data-test-subj="transformPivotPreview error">
        <PreviewTitle previewRequest={previewRequest} />
        <EuiCallOut
          title={i18n.translate('xpack.transform.pivotPreview.PivotPreviewError', {
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

  if (previewData.length === 0) {
    let noDataMessage = i18n.translate(
      'xpack.transform.pivotPreview.PivotPreviewNoDataCalloutBody',
      {
        defaultMessage:
          'The preview request did not return any data. Please ensure the optional query returns data and that values exist for the field used by group-by and aggregation fields.',
      }
    );

    const aggsArr = dictionaryToArray(aggs);
    if (aggsArr.length === 0 || groupByArr.length === 0) {
      noDataMessage = i18n.translate(
        'xpack.transform.pivotPreview.PivotPreviewIncompleteConfigCalloutBody',
        {
          defaultMessage: 'Please choose at least one group-by field and aggregation.',
        }
      );
    }
    return (
      <EuiPanel grow={false} data-test-subj="transformPivotPreview empty">
        <PreviewTitle previewRequest={previewRequest} />
        <EuiCallOut
          title={i18n.translate('xpack.transform.pivotPreview.PivotPreviewNoDataCalloutTitle', {
            defaultMessage: 'Pivot preview not available',
          })}
          color="primary"
        >
          <p>{noDataMessage}</p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  const columnKeys = getFlattenedFields(previewData[0]);
  columnKeys.sort(sortColumns(groupByArr));

  const columns = columnKeys.map(k => {
    const column: ColumnType<PreviewItem> = {
      field: k,
      name: k,
      sortable: true,
      truncateText: true,
    };
    if (typeof previewMappings.properties[k] !== 'undefined') {
      const esFieldType = previewMappings.properties[k].type;
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

  const MlInMemoryTableBasic = mlInMemoryTableBasicFactory<PreviewItem>();

  return (
    <EuiPanel data-test-subj="transformPivotPreview loaded">
      <PreviewTitle previewRequest={previewRequest} />
      {status === PIVOT_PREVIEW_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== PIVOT_PREVIEW_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {previewData.length > 0 && clearTable === false && columns.length > 0 && (
        <MlInMemoryTableBasic
          allowNeutralSort={false}
          compressed
          items={previewData}
          columns={columns}
          pagination={{
            initialPageSize: 5,
            pageSizeOptions: [5, 10, 25],
          }}
          rowProps={() => ({
            'data-test-subj': 'transformPivotPreviewRow',
          })}
          sorting={sorting}
        />
      )}
    </EuiPanel>
  );
});
