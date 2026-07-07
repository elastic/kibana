/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import { EuiFlexGroup, EuiFlexItem, EuiScreenReaderOnly, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { BodyRow } from './body_row';
import { BodyRows } from './body_rows';
import { DraggableBodyRow } from './draggable_body_row';
import { DraggableBodyRows } from './draggable_body_rows';
import { HeaderRow } from './header_row';
import type { Column } from './types';
import * as Styles from './styles';

interface ReorderableTableProps<Item> {
  ariaLabel?: string;
  bottomRows?: React.ReactNode[];
  className?: string;
  columns: Array<Column<Item>>;
  disableDragging?: boolean;
  disableReordering?: boolean;
  items: Item[];
  noItemsMessage: React.ReactNode;
  onReorder?: (items: Item[], oldItems: Item[]) => void;
  rowErrors?: (item: Item) => string[] | undefined;
  rowProps?: (item: Item) => object;
  showRowIndex?: boolean;
  unreorderableItems?: Item[];
}

export const ReorderableTable = <Item extends object>({
  ariaLabel = 'Reorderable table',
  bottomRows = [],
  className = '',
  columns,
  disableDragging = false,
  disableReordering = false,
  items,
  noItemsMessage,
  onReorder = () => undefined,
  rowErrors = () => undefined,
  rowProps = () => ({}),
  showRowIndex = false,
  unreorderableItems = [],
}: ReorderableTableProps<Item>) => {
  const { euiTheme } = useEuiTheme();
  // Calculate row index offset (header row = 1)
  const rowIndexOffset = 2; // Start body rows at index 2

  return (
    <div
      className={classNames(className)}
      css={Styles.reorderableTableStyles(euiTheme)}
      role="table"
      aria-label={ariaLabel}
    >
      <HeaderRow
        columns={columns}
        leftAction={
          disableReordering ? undefined : (
            <EuiScreenReaderOnly>
              <p>
                {i18n.translate(
                  'xpack.contentConnectors.reorderableTable.grabHandleScreenReaderOnlyLabel',
                  { defaultMessage: 'Grab handle' }
                )}
              </p>
            </EuiScreenReaderOnly>
          )
        }
        spacingForRowIdentifier={showRowIndex}
      />

      {items.length === 0 && unreorderableItems.length === 0 && bottomRows.length === 0 && (
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem data-test-subj="NoItems" className="reorderableTableNoItems">
            {noItemsMessage}
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {items.length > 0 && disableReordering && (
        <BodyRows
          items={items}
          renderItem={(item, itemIndex) => (
            <BodyRow
              key={`table_draggable_row_${itemIndex}`}
              columns={columns}
              item={item}
              additionalProps={rowProps(item)}
              errors={rowErrors(item)}
              rowIdentifier={showRowIndex ? `${itemIndex + 1}` : undefined}
              ariaRowindex={itemIndex + rowIndexOffset}
            />
          )}
        />
      )}

      {items.length > 0 && !disableReordering && (
        <>
          <DraggableBodyRows
            items={items}
            renderItem={(item, itemIndex) => (
              <DraggableBodyRow
                key={`table_draggable_row_${itemIndex}`}
                columns={columns}
                item={item}
                additionalProps={rowProps(item)}
                disableDragging={disableDragging}
                rowIndex={itemIndex}
                errors={rowErrors(item)}
                rowIdentifier={showRowIndex ? `${itemIndex + 1}` : undefined}
                ariaRowindex={itemIndex + rowIndexOffset}
              />
            )}
            onReorder={onReorder}
          />
        </>
      )}
      <div className="unorderableRows">
        {unreorderableItems.length > 0 && (
          <BodyRows
            items={unreorderableItems}
            renderItem={(item, itemIndex) => {
              const rowIndex = items.length + itemIndex + rowIndexOffset;
              return (
                <BodyRow
                  key={`table_draggable_row_${itemIndex}`}
                  columns={columns}
                  item={item}
                  additionalProps={rowProps(item)}
                  errors={rowErrors(item)}
                  leftAction={disableReordering ? undefined : <> </>}
                  rowIdentifier={showRowIndex ? '∞' : undefined}
                  ariaRowindex={rowIndex}
                />
              );
            }}
          />
        )}

        {bottomRows.map((row, rowIndex) => {
          const ariaRowIndex = items.length + unreorderableItems.length + rowIndex + rowIndexOffset;
          return (
            <BodyRow // Shoving a generic ReactNode into a BodyRow is kind of a hack
              key={rowIndex}
              rowIdentifier={showRowIndex ? '∞' : undefined}
              columns={[{ render: () => row }]}
              item={{}}
              leftAction={disableReordering ? undefined : <> </>}
              data-test-subj="BottomRow"
              ariaRowindex={ariaRowIndex}
            />
          );
        })}
      </div>
    </div>
  );
};
