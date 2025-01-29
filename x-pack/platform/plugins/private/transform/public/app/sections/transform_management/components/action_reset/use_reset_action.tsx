/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import type { TransformListRowWithStats } from '../../../../common/transform_list';
import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { TRANSFORM_STATE } from '../../../../../../common/constants';

import type { TransformListAction, TransformListRow } from '../../../../common';
import { useTransformCapabilities, useResetTransforms } from '../../../../hooks';

import {
  resetActionNameText,
  isResetActionDisabled,
  ResetActionName,
  getResetActionDisabledMessage,
} from './reset_action_name';

export type ResetAction = ReturnType<typeof useResetAction>;
export const useResetAction = (forceDisable: boolean) => {
  const { canResetTransform } = useTransformCapabilities();

  const resetTransforms = useResetTransforms();

  const [isModalVisible, setModalVisible] = useState(false);
  const [items, setItems] = useState<TransformListRow[]>([]);

  const shouldForceReset = useMemo(
    () => items.some((i: TransformListRow) => i.stats?.state === TRANSFORM_STATE.FAILED),
    [items]
  );

  const closeModal = () => setModalVisible(false);

  const resetAndCloseModal = () => {
    setModalVisible(false);

    resetTransforms({
      transformsInfo: items
        .filter<TransformListRowWithStats>(isTransformListRowWithStats)
        .map((i) => ({
          id: i.config.id,
          state: i.stats.state,
        })),
    });
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
        <ResetActionName
          {...{
            canResetTransform,
            disabled: isResetActionDisabled([item], forceDisable),
            isBulkAction: false,
            items: [item],
          }}
        />
      ),
      enabled: (item: TransformListRow) =>
        getResetActionDisabledMessage({ items: [item], canResetTransform, forceDisable }) ===
        undefined,
      description: resetActionNameText,
      icon: 'refresh',
      type: 'icon',
      onClick: (item: TransformListRow) => openModal([item]),
      'data-test-subj': 'transformActionReset',
    }),
    [canResetTransform, forceDisable]
  );

  return {
    action,
    closeModal,
    resetAndCloseModal,
    isModalVisible,
    items,
    openModal,
    shouldForceReset,
  };
};
