/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { TRANSFORM_STATE } from '../../../../../../common/constants';
import type { TransformListAction, TransformListRow } from '../../../../common';
import { useTransformCapabilities, useStopTransforms } from '../../../../hooks';
import { isStopActionDisabled, stopActionNameText, StopActionName } from './stop_action_name';
import { isManagedTransform } from '../../../../common/managed_transforms_utils';

export type StopAction = ReturnType<typeof useStopAction>;

export const useStopAction = (forceDisable: boolean) => {
  const { canStartStopTransform } = useTransformCapabilities();
  const stopTransforms = useStopTransforms();
  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const closeModal = () => setModalVisible(false);
  const openModal = (newItems: TransformListRow[]) => {
    if (Array.isArray(newItems)) {
      setItems(newItems);
      setModalVisible(true);
    }
  };
  const stopAndCloseModal = useCallback(
    (transformSelection: TransformListRow[]) => {
      setModalVisible(false);
      stopTransforms(
        transformSelection.map((t) => ({ id: t.id, state: t.stats ? t.stats.state : 'waiting' }))
      );
    },
    [stopTransforms]
  );

  const clickHandler = useCallback(
    (t: TransformListRow) =>
      stopTransforms([{ id: t.id, state: t.stats ? t.stats.state : 'waiting' }]),
    [stopTransforms]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => (
        <StopActionName items={[item]} forceDisable={forceDisable} />
      ),
      available: (item: TransformListRow) =>
        isTransformListRowWithStats(item) ? item.stats.state !== TRANSFORM_STATE.STOPPED : true,
      enabled: (item: TransformListRow) =>
        isTransformListRowWithStats(item) &&
        !isStopActionDisabled([item], canStartStopTransform, forceDisable),
      description: stopActionNameText,
      icon: 'stop',
      type: 'icon',
      onClick: (item: TransformListRow) => {
        if (isManagedTransform(item)) {
          openModal([item]);
        } else {
          clickHandler(item);
        }
      },
      'data-test-subj': 'transformActionStop',
    }),
    [canStartStopTransform, clickHandler, forceDisable]
  );

  return { action, closeModal, openModal, isModalVisible, items, stopAndCloseModal };
};
