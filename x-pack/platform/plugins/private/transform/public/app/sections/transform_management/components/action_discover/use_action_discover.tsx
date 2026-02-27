/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { DISCOVER_APP_LOCATOR } from '@kbn/discover-plugin/common';
import type { TransformListAction, TransformListRow } from '../../../../common';

import { useAppDependencies } from '../../../../app_dependencies';
import { useGetDataViewsTitleIdMap } from '../../../../hooks';

import {
  isDiscoverActionDisabled,
  discoverActionNameText,
  DiscoverActionName,
} from './discover_action_name';

export type DiscoverAction = ReturnType<typeof useDiscoverAction>;
export const useDiscoverAction = (forceDisable: boolean) => {
  const {
    share,
    application: { capabilities },
  } = useAppDependencies();
  const isDiscoverAvailable = !!capabilities.discover_v2?.show;

  const { data: dataViewsTitleIdMap } = useGetDataViewsTitleIdMap();

  const clickHandler = useCallback(
    (item: TransformListRow) => {
      const locator = share.url.locators.get(DISCOVER_APP_LOCATOR);
      if (!locator || !dataViewsTitleIdMap) return;
      const dataViewId = dataViewsTitleIdMap[item.config.dest.index];
      if (dataViewId) {
        locator.navigateSync({
          indexPatternId: dataViewId,
        });
      }
    },
    [dataViewsTitleIdMap, share]
  );

  const dataViewExists = useCallback(
    (item: TransformListRow): boolean => {
      if (!dataViewsTitleIdMap) {
        return false;
      }

      const dataViewId = dataViewsTitleIdMap[item.config.dest.index];
      return dataViewId !== undefined;
    },
    [dataViewsTitleIdMap]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => {
        return <DiscoverActionName items={[item]} dataViewExists={dataViewExists(item)} />;
      },
      available: () => isDiscoverAvailable,
      enabled: (item: TransformListRow) =>
        !isDiscoverActionDisabled([item], forceDisable, dataViewExists(item)),
      description: discoverActionNameText,
      icon: 'visTable',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionDiscover',
    }),
    [forceDisable, dataViewExists, isDiscoverAvailable, clickHandler]
  );

  return { action };
};
