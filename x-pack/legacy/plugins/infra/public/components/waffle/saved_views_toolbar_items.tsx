/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Action } from 'typescript-fsa';
import { SavedViewListFlyout } from './saved_view_list_flyout';
import { SavedViewCreateModal } from './saved_view_create_modal';
import { useCreateSavedObject } from '../../hooks/use_create_saved_object';
import { useFindSavedObject } from '../../hooks/use_find_saved_object';
import { WaffleViewState } from '../../containers/waffle/with_waffle_view_state';
import {
  InfraSnapshotMetricInput,
  InfraSnapshotGroupbyInput,
  InfraNodeType,
} from '../../graphql/types';
import { InfraWaffleMapBounds, InfraGroupByOptions } from '../../lib/lib';
import { KueryFilterQuery, SerializedFilterQuery } from '../../store/local/waffle_filter';

interface Props {
  viewState: WaffleViewState;
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

export const SavedViewsToolbarControls = (props: Props) => {
  const { data, loading, find } = useFindSavedObject('config');
  const { create } = useCreateSavedObject('config');
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadViews = useCallback(() => {
    find();
    setModalOpen(true);
  }, []);

  const saveView = (view: any) => {
    view.data = {
      ...view.data,
      ...props.viewState,
    };
    create(view);
  };

  const openSaveModal = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const views: Array<{ name: string; id: string } & WaffleViewState> = [];
  if (data) {
    data.savedObjects.forEach(
      o =>
        o.attributes.data &&
        views.push({
          ...(o.attributes.data as WaffleViewState),
          name: (o.attributes.data as any).name,
          id: o.id,
        })
    );
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiButtonEmpty onClick={openSaveModal}>
          <FormattedMessage
            defaultMessage="Save View"
            id="xpack.infra.waffle.savedViews.saveViewLabel"
          />
        </EuiButtonEmpty>
        <EuiButtonEmpty onClick={loadViews}>
          <FormattedMessage
            defaultMessage="Load Views"
            id="xpack.infra.waffle.savedViews.loadViewsLabel"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>

      {modalOpen && (
        <SavedViewListFlyout
          loading={loading}
          views={views}
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

      {createModalOpen && <SavedViewCreateModal close={closeCreateModal} save={saveView} />}
    </>
  );
};
