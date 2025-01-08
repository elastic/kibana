/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { useSelector } from 'react-redux';

import { canUserWrite as canUserWriteSelector } from '../../../state/selectors/app';
import type { State } from '../../../../types';
import { useDeleteWorkpads } from '../hooks';
import { useDownloadWorkpad } from '../../hooks';

import {
  WorkpadTableTools as Component,
  Props as ComponentProps,
} from './workpad_table_tools.component';
import { WorkpadsContext } from './my_workpads';

export type Props = Pick<ComponentProps, 'selectedWorkpadIds'>;

export const WorkpadTableTools = ({ selectedWorkpadIds }: Props) => {
  const deleteWorkpads = useDeleteWorkpads();
  const downloadWorkpad = useDownloadWorkpad();
  const context = useContext(WorkpadsContext);

  const { canUserWrite } = useSelector((state: State) => ({
    canUserWrite: canUserWriteSelector(state),
  }));

  if (context === null || selectedWorkpadIds.length <= 0) {
    return null;
  }

  const { workpads, setWorkpads } = context;

  const onExport = () => selectedWorkpadIds.map((id) => downloadWorkpad(id));
  const onDelete = async () => {
    const { removedIds } = await deleteWorkpads(selectedWorkpadIds);
    setWorkpads(workpads.filter((workpad) => !removedIds.includes(workpad.id)));
  };

  return (
    <Component
      {...{ workpads, selectedWorkpadIds, canUserWrite }}
      onDeleteWorkpads={onDelete}
      onExportWorkpads={onExport}
    />
  );
};
