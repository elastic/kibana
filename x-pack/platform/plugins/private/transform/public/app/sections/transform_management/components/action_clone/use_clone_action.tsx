/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import type { TransformListAction, TransformListRow } from '../../../../common';
import { SECTION_SLUG } from '../../../../common/constants';
import { useGetDataViewsTitleIdMap, useTransformCapabilities } from '../../../../hooks';
import { useToastNotifications } from '../../../../app_dependencies';

import { cloneActionNameText, CloneActionName } from './clone_action_name';

export type CloneAction = ReturnType<typeof useCloneAction>;
export const useCloneAction = (forceDisable: boolean, transformNodes: number) => {
  const history = useHistory();
  const toastNotifications = useToastNotifications();

  const { data: dataViewsTitleIdMap } = useGetDataViewsTitleIdMap();
  const { canCreateTransform } = useTransformCapabilities();

  const clickHandler = useCallback(
    async (item: TransformListRow) => {
      try {
        if (!dataViewsTitleIdMap) {
          return;
        }

        const dataViewTitle = Array.isArray(item.config.source.index)
          ? item.config.source.index.join(',')
          : item.config.source.index;
        const dataViewId = dataViewsTitleIdMap[dataViewTitle];

        if (dataViewId === undefined) {
          toastNotifications.addDanger(
            i18n.translate('xpack.transform.clone.noDataViewErrorPromptText', {
              defaultMessage:
                'Unable to clone the transform {transformId}. No data view exists for {dataViewTitle}.',
              values: { dataViewTitle, transformId: item.id },
            })
          );
        } else {
          history.push(`/${SECTION_SLUG.CLONE_TRANSFORM}/${item.id}?dataViewId=${dataViewId}`);
        }
      } catch (e) {
        toastNotifications.addError(e, {
          title: i18n.translate('xpack.transform.clone.errorPromptText', {
            defaultMessage: 'An error occurred checking if source data view exists',
          }),
        });
      }
    },
    [dataViewsTitleIdMap, history, toastNotifications]
  );

  const action: TransformListAction = useMemo(
    () => ({
      name: (item: TransformListRow) => <CloneActionName disabled={!canCreateTransform} />,
      enabled: () =>
        dataViewsTitleIdMap !== undefined &&
        canCreateTransform &&
        !forceDisable &&
        transformNodes > 0,
      description: cloneActionNameText,
      icon: 'copy',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'transformActionClone',
    }),
    [canCreateTransform, dataViewsTitleIdMap, forceDisable, clickHandler, transformNodes]
  );

  return { action };
};
