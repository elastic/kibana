/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import moment from 'moment-timezone';

import { i18n } from '@kbn/i18n';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiCheckbox,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiText,
  EuiTitle,
  EuiToolTip,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import {
  ColumnType,
  mlInMemoryTableBasicFactory,
  SortingPropType,
  SORT_DIRECTION,
} from '../../../../../shared_imports';

import { KBN_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
import { Dictionary } from '../../../../../../common/types/common';
import { formatHumanReadableDateTimeSeconds } from '../../../../../../common/utils/date_utils';

import { useCurrentIndexPattern } from '../../../../lib/kibana';

import {
  toggleSelectedField,
  EsDoc,
  EsFieldName,
  MAX_COLUMNS,
  PivotQuery,
} from '../../../../common';

import { getSourceIndexDevConsoleStatement } from './common';
import { ExpandedRow } from './expanded_row';
import { SOURCE_INDEX_STATUS, useSourceIndexData } from './use_source_index_data';

type ItemIdToExpandedRowMap = Dictionary<JSX.Element>;

const CELL_CLICK_ENABLED = false;

interface SourceIndexPreviewTitle {
  indexPatternTitle: string;
}
const SourceIndexPreviewTitle: React.FC<SourceIndexPreviewTitle> = ({ indexPatternTitle }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.transform.sourceIndexPreview.sourceIndexPatternTitle', {
        defaultMessage: 'Source index {indexPatternTitle}',
        values: { indexPatternTitle },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  query: PivotQuery;
  cellClick?(search: string): void;
}

export const SourceIndexPreview: React.FC<Props> = React.memo(({ cellClick, query }) => {
  const [clearTable, setClearTable] = useState(false);

  const indexPattern = useCurrentIndexPattern();

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

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState(
    {} as ItemIdToExpandedRowMap
  );

  function toggleDetails(item: EsDoc) {
    if (itemIdToExpandedRowMap[item._id]) {
      delete itemIdToExpandedRowMap[item._id];
    } else {
      itemIdToExpandedRowMap[item._id] = <ExpandedRow item={item} />;
    }
    // spread to a new object otherwise the component wouldn't re-render
    setItemIdToExpandedRowMap({ ...itemIdToExpandedRowMap });
  }

  const { errorMessage, status, tableItems } = useSourceIndexData(
    indexPattern,
    query,
    selectedFields,
    setSelectedFields
  );

  if (status === SOURCE_INDEX_STATUS.ERROR) {
    return (
      <EuiPanel grow={false} data-test-subj="transformSourceIndexPreview error">
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate('xpack.transform.sourceIndexPreview.sourceIndexPatternError', {
            defaultMessage: 'An error occurred loading the source index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {errorMessage}
          </EuiCodeBlock>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (status === SOURCE_INDEX_STATUS.LOADED && tableItems.length === 0) {
    return (
      <EuiPanel grow={false} data-test-subj="transformSourceIndexPreview empty">
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate(
            'xpack.transform.sourceIndexPreview.SourceIndexNoDataCalloutTitle',
            {
              defaultMessage: 'Empty source index query result.',
            }
          )}
          color="primary"
        >
          <p>
            {i18n.translate('xpack.transform.sourceIndexPreview.SourceIndexNoDataCalloutBody', {
              defaultMessage:
                'The query for the source index returned no results. Please make sure you have sufficient permissions, the index contains documents and your query is not too restrictive.',
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

  const columns: Array<ColumnType<EsDoc>> = selectedFields.map(k => {
    const column: ColumnType<EsDoc> = {
      field: `_source["${k}"]`,
      name: k,
      sortable: true,
      truncateText: true,
    };

    const field = indexPattern.fields.find(f => f.name === k);

    const formatField = (d: string) => {
      return field !== undefined && field.type === KBN_FIELD_TYPES.DATE
        ? formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000)
        : d;
    };

    const render = (d: any) => {
      if (Array.isArray(d) && d.every(item => typeof item === 'string')) {
        // If the cells data is an array of strings, return as a comma separated list.
        // The list will get limited to 5 items with `…` at the end if there's more in the original array.
        return `${d
          .map(item => formatField(item))
          .slice(0, 5)
          .join(', ')}${d.length > 5 ? ', …' : ''}`;
      } else if (Array.isArray(d)) {
        // If the cells data is an array of e.g. objects, display a 'array' badge with a
        // tooltip that explains that this type of field is not supported in this table.
        return (
          <EuiToolTip
            content={i18n.translate(
              'xpack.transform.sourceIndexPreview.SourceIndexArrayToolTipContent',
              {
                defaultMessage:
                  'The full content of this array based column is available in the expanded row.',
              }
            )}
          >
            <EuiBadge>
              {i18n.translate('xpack.transform.sourceIndexPreview.SourceIndexArrayBadgeContent', {
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
              'xpack.transform.sourceIndexPreview.SourceIndexObjectToolTipContent',
              {
                defaultMessage:
                  'The full content of this object based column is available in the expanded row.',
              }
            )}
          >
            <EuiBadge>
              {i18n.translate('xpack.transform.sourceIndexPreview.SourceIndexObjectBadgeContent', {
                defaultMessage: 'object',
              })}
            </EuiBadge>
          </EuiToolTip>
        );
      }

      return formatField(d);
    };

    if (typeof field !== 'undefined') {
      switch (field.type) {
        case KBN_FIELD_TYPES.BOOLEAN:
          column.dataType = 'boolean';
          break;
        case KBN_FIELD_TYPES.DATE:
          column.align = 'right';
          column.render = (d: any) => formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000);
          break;
        case KBN_FIELD_TYPES.NUMBER:
          column.dataType = 'number';
          break;
        default:
          column.render = render;
          break;
      }
    } else {
      column.render = render;
    }

    if (CELL_CLICK_ENABLED && cellClick) {
      column.render = (d: string) => (
        <EuiButtonEmpty size="xs" onClick={() => cellClick(`${k}:(${d})`)}>
          {render(d)}
        </EuiButtonEmpty>
      );
    }

    return column;
  });

  let sorting: SortingPropType = false;

  if (columns.length > 0) {
    sorting = {
      sort: {
        field: `_source["${selectedFields[0]}"]`,
        direction: SORT_DIRECTION.ASC,
      },
    };
  }

  columns.unshift({
    align: RIGHT_ALIGNMENT,
    width: '40px',
    isExpander: true,
    render: (item: EsDoc) => (
      <EuiButtonIcon
        onClick={() => toggleDetails(item)}
        aria-label={
          itemIdToExpandedRowMap[item._id]
            ? i18n.translate('xpack.transform.sourceIndexPreview.rowCollapse', {
                defaultMessage: 'Collapse',
              })
            : i18n.translate('xpack.transform.sourceIndexPreview.rowExpand', {
                defaultMessage: 'Expand',
              })
        }
        iconType={itemIdToExpandedRowMap[item._id] ? 'arrowUp' : 'arrowDown'}
      />
    ),
  });

  const euiCopyText = i18n.translate('xpack.transform.sourceIndexPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the source index preview to the clipboard.',
  });

  const MlInMemoryTableBasic = mlInMemoryTableBasicFactory<EsDoc>();

  return (
    <EuiPanel grow={false} data-test-subj="transformSourceIndexPreview loaded">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem style={{ textAlign: 'right' }}>
              {docFieldsCount > MAX_COLUMNS && (
                <EuiText size="s">
                  {i18n.translate('xpack.transform.sourceIndexPreview.fieldSelection', {
                    defaultMessage:
                      '{selectedFieldsLength, number} of {docFieldsCount, number} {docFieldsCount, plural, one {field} other {fields}} selected',
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
                        'xpack.transform.sourceIndexPreview.selectColumnsAriaLabel',
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
                    {i18n.translate('xpack.transform.sourceIndexPreview.selectFieldsPopoverTitle', {
                      defaultMessage: 'Select fields',
                    })}
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
            <EuiFlexItem grow={false}>
              <EuiCopy
                beforeMessage={euiCopyText}
                textToCopy={getSourceIndexDevConsoleStatement(query, indexPattern.title)}
              >
                {(copy: () => void) => (
                  <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {status === SOURCE_INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== SOURCE_INDEX_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {clearTable === false && columns.length > 0 && sorting !== false && (
        <MlInMemoryTableBasic
          allowNeutralSort={false}
          compressed
          items={tableItems}
          columns={columns}
          pagination={{
            initialPageSize: 5,
            pageSizeOptions: [5, 10, 25],
          }}
          hasActions={false}
          isSelectable={false}
          itemId="_id"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable={true}
          rowProps={item => ({
            'data-test-subj': `transformSourceIndexPreviewRow row-${item._id}`,
          })}
          sorting={sorting}
        />
      )}
    </EuiPanel>
  );
});
