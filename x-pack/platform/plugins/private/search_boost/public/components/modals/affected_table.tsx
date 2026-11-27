/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { AffectedTarget, BoostProfileType } from '../../../common/types';
import { AFFECTED_TARGET_COLUMNS } from '../../translations';
import type { ModalTableColumn } from './modal_table';
import { ModalTable } from './modal_table';

export interface AffectedTableProps<T extends AffectedTarget> {
  'aria-label': string;
  type: BoostProfileType;
  targets: readonly T[];
  /** The columns after the index or data stream name. */
  columns: ReadonlyArray<ModalTableColumn<T>>;
  isNested?: boolean;
  'data-test-subj': string;
}

const getName = ({ name }: AffectedTarget) => name;

export const AffectedTable = <T extends AffectedTarget>({
  type,
  targets,
  columns,
  ...tableProps
}: AffectedTableProps<T>) => {
  const sortedTargets = useMemo(
    () => [...targets].sort((a, b) => a.name.localeCompare(b.name)),
    [targets]
  );

  return (
    <ModalTable
      {...tableProps}
      items={sortedTargets}
      getRowId={getName}
      columns={[
        {
          id: 'name',
          name: AFFECTED_TARGET_COLUMNS[type],
          render: getName,
        },
        ...columns,
      ]}
    />
  );
};
