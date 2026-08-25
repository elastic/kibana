/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

import type { TransformListAction, TransformListRow } from '../../../../common';
import { useTransformCapabilities, useStartTransforms } from '../../../../hooks';

import { isStartActionDisabled, startActionNameText, StartActionName } from './start_action_name';

export type StartAction = ReturnType<typeof useStartAction>;
export const useStartAction = (forceDisable: boolean, transformNodes: number) => {
  const { canStartStopTransform } = useTransformCapabilities();

  const startTransforms = useStartTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);

  const startAndCloseModal = () => {
    setModalVisible(false);
    startTransforms(items.map((i) => ({ id: i.id })));
  };

  const openModal = (newItems: TransformListRow[]) => {
    if (Array.isArray(newItems)) {
      setItems(newItems);
      setModalVisible(true);
    }
  };

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => (
        <StartActionName
          items={[item]}
          forceDisable={forceDisable}
          transformNodes={transformNodes}
        />
      ),
      available: (item: TransformListRow) =>
        isTransformListRowWithStats(item) ? item.stats.state === TRANSFORM_STATE.STOPPED : true,
      enabled: (item: TransformListRow) =>
        !isStartActionDisabled([item], canStartStopTransform, transformNodes),
      description: startActionNameText,
      icon: 'play',
      type: 'icon',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionStart',
    }),
    [canStartStopTransform, forceDisable, transformNodes]
  );

  return {
    action,
    closeModal,
    isModalVisible,
    items,
    openModal,
    startAndCloseModal,
  };
};
