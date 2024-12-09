/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { getSelectedToplevelNodes, getSelectedElementId } from '../../../state/selectors/workpad';
import { State } from '../../../../types';
import { SidebarContent as Component } from './sidebar_content.component';

interface SidebarContentProps {
  commit?: Function;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({ commit }) => {
  const selectedToplevelNodes = useSelector<State, string[]>(
    (state) => getSelectedToplevelNodes(state),
    shallowEqual
  );

  const selectedElementId = useSelector<State, string | null>(
    (state) => getSelectedElementId(state),
    shallowEqual
  );

  return (
    <Component
      commit={commit}
      selectedToplevelNodes={selectedToplevelNodes}
      selectedElementId={selectedElementId}
    />
  );
};
