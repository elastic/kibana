/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Discover-style filter for / filter out controls on ElasticOn inventory
 * grids — mirrors {@link buildCellActions} in `@kbn/unified-data-table`.
 */

import type { MutableRefObject } from 'react';
import React from 'react';
import type { EuiDataGridColumnCellAction, EuiDataGridRefProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type InventoryCellFilterMode = '+' | '-';

const FilterForAction = ({
  Component,
  columnId,
  columnLabel,
  onClick,
}: {
  Component: EuiDataGridColumnCellActionProps['Component'];
  columnId: string;
  columnLabel: string;
  onClick: () => void;
}) => {
  const buttonTitle = i18n.translate(
    'xpack.streams.entityCentricLab.entities.grid.filterForAria',
    {
      defaultMessage: 'Filter for this {value}',
      values: { value: columnLabel || columnId },
    }
  );

  return (
    <Component
      onClick={onClick}
      iconType="plusCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="filterForButton"
    >
      {i18n.translate('xpack.streams.entityCentricLab.entities.grid.filterFor', {
        defaultMessage: 'Filter for',
      })}
    </Component>
  );
};

const FilterOutAction = ({
  Component,
  columnId,
  columnLabel,
  onClick,
}: {
  Component: EuiDataGridColumnCellActionProps['Component'];
  columnId: string;
  columnLabel: string;
  onClick: () => void;
}) => {
  const buttonTitle = i18n.translate(
    'xpack.streams.entityCentricLab.entities.grid.filterOutAria',
    {
      defaultMessage: 'Filter out this {value}',
      values: { value: columnLabel || columnId },
    }
  );

  return (
    <Component
      onClick={onClick}
      iconType="minusCircle"
      aria-label={buttonTitle}
      title={buttonTitle}
      data-test-subj="filterOutButton"
    >
      {i18n.translate('xpack.streams.entityCentricLab.entities.grid.filterOut', {
        defaultMessage: 'Filter out',
      })}
    </Component>
  );
};

type EuiDataGridColumnCellActionProps = Parameters<EuiDataGridColumnCellAction>[0];

export const buildInventoryFilterCellActions = ({
  columnId,
  columnLabel,
  getRowValue,
  onFilter,
  dataGridRef,
}: {
  columnId: string;
  columnLabel: string;
  getRowValue: (rowIndex: number) => string | undefined;
  onFilter: (rowIndex: number, mode: InventoryCellFilterMode) => void;
  dataGridRef?: MutableRefObject<EuiDataGridRefProps | null>;
}): EuiDataGridColumnCellAction[] => [
  (cellActionProps) => {
    const value = getRowValue(cellActionProps.rowIndex);
    if (!value) return null;
    return (
      <FilterForAction
        Component={cellActionProps.Component}
        columnId={columnId}
        columnLabel={columnLabel}
        onClick={() => {
          onFilter(cellActionProps.rowIndex, '+');
          dataGridRef?.current?.closeCellPopover();
        }}
      />
    );
  },
  (cellActionProps) => {
    const value = getRowValue(cellActionProps.rowIndex);
    if (!value) return null;
    return (
      <FilterOutAction
        Component={cellActionProps.Component}
        columnId={columnId}
        columnLabel={columnLabel}
        onClick={() => {
          onFilter(cellActionProps.rowIndex, '-');
          dataGridRef?.current?.closeCellPopover();
        }}
      />
    );
  },
];
