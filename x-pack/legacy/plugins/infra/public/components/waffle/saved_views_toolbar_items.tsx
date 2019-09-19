/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { Action } from 'typescript-fsa';
import { SavedObjectAttributes } from 'src/core/server';
import { SavedViewListFlyout } from './saved_view_list_flyout';
import { SavedViewCreateModal } from './saved_view_create_modal';
import { useCreateSavedObject } from '../../hooks/use_create_saved_object';
import { useFindSavedObject } from '../../hooks/use_find_saved_object';
import { WaffleViewState, SavedView } from '../../containers/waffle/with_waffle_view_state';
import {
  InfraSnapshotMetricInput,
  InfraSnapshotGroupbyInput,
  InfraNodeType,
} from '../../graphql/types';
import { InfraWaffleMapBounds, InfraGroupByOptions } from '../../lib/lib';
import { KueryFilterQuery, SerializedFilterQuery } from '../../store/local/waffle_filter';
import { useDeleteSavedObject } from '../../hooks/use_delete_saved_object';
interface Props {
  viewState: WaffleViewState;
  defaultViewState: WaffleViewState;
  changeMetric: (payload: InfraSnapshotMetricInput) => Action<InfraSnapshotMetricInput>;
  changeGroupBy: (payload: InfraSnapshotGroupbyInput[]) => Action<InfraSnapshotGroupbyInput[]>;
  changeNodeType: (payload: InfraNodeType) => Action<InfraNodeType>;
  changeView: (payload: string) => Action<string>;
  changeCustomOptions: (payload: InfraGroupByOptions[]) => Action<InfraGroupByOptions[]>;
  changeBoundsOverride: (payload: InfraWaffleMapBounds) => Action<InfraWaffleMapBounds>;
  changeAutoBounds: (payload: boolean) => Action<boolean>;
  jumpToTime: (payload: number) => Action<number>;
  startAutoReload: () => Action<undefined>;
  stopAutoReload: () => Action<undefined>;
  applyFilterQuery: (payload: KueryFilterQuery) => Action<SerializedFilterQuery>;
}

export interface SavedViewSavedObject extends SavedObjectAttributes {
  type: string;
  data: { [p: string]: any };
}

export const SavedViewsToolbarControls = (props: Props) => {
  const { data, loading, find } = useFindSavedObject<SavedViewSavedObject>('config');
  const savedObjects = data ? data.savedObjects : [];

  const { create } = useCreateSavedObject('config');
  const { deleteObject, deletedId } = useDeleteSavedObject('config');
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const deleteView = useCallback((id: string) => deleteObject(id), []);
  const openSaveModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const loadViews = useCallback(() => {
    find();
    setModalOpen(true);
  }, []);
  const saveView = useCallback(
    (view: SavedViewSavedObject, shouldIncludeTime: boolean = false) => {
      const currentState = {
        ...props.viewState,
        ...(!shouldIncludeTime ? { time: undefined } : {}),
      };
      view.data = { ...view.data, ...currentState };

      create(view);
    },
    [props.viewState]
  );

  const views = useMemo(() => {
    const items: SavedView[] = [
      {
        name: i18n.translate('xpack.infra.savedView.defaultViewName', {
          defaultMessage: 'Default View',
        }),
        id: '0',
        isDefault: true,
        ...props.defaultViewState,
      },
    ];

    if (data) {
      data.savedObjects.forEach(
        o =>
          o.attributes.type === 'SAVED_VIEW' &&
          items.push({
            ...o.attributes.data,
            name: o.attributes.data.name,
            id: o.id,
          })
      );
    }

    return items;
  }, [savedObjects, props.defaultViewState]);

  useEffect(() => {
    if (deletedId !== undefined) {
      // INFO: Refresh view list after an item is deleted
      loadViews();
    }
  }, [deletedId]);

  return (
    <>
      <EuiFlexGroup>
        <EuiButtonEmpty onClick={openSaveModal}>
          <FormattedMessage
            defaultMessage="Save view"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty onClick={loadViews}>
          <FormattedMessage
            defaultMessage="Load views"
            id="xpack.infra.waffle.savedViews.loadViewsLabel"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>

      {createModalOpen && <SavedViewCreateModal close={closeCreateModal} save={saveView} />}
      {modalOpen && (
        <SavedViewListFlyout
          loading={loading}
          views={views}
          deleteView={deleteView}
          close={closeModal}
          loadView={(viewState: WaffleViewState) => {
            if (viewState.time) {
              props.jumpToTime(viewState.time);
            }
            if (viewState.autoReload) {
              props.startAutoReload();
            } else if (typeof viewState.autoReload !== 'undefined' && !viewState.autoReload) {
              props.stopAutoReload();
            }
            if (viewState.metric) {
              props.changeMetric(viewState.metric);
            }
            if (viewState.groupBy) {
              props.changeGroupBy(viewState.groupBy);
            }
            if (viewState.nodeType) {
              props.changeNodeType(viewState.nodeType);
            }
            if (viewState.view) {
              props.changeView(viewState.view);
            }
            if (viewState.customOptions) {
              props.changeCustomOptions(viewState.customOptions);
            }
            if (viewState.bounds) {
              props.changeBoundsOverride(viewState.bounds);
            }
            if (viewState.auto) {
              props.changeAutoBounds(viewState.auto);
            }
            if (viewState.filterQuery) {
              props.applyFilterQuery(viewState.filterQuery);
            }
          }}
        />
      )}
    </>
  );
};
