/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Store, Unsubscribe } from 'redux';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { getLastUpdatedLazy } from './methods';
import type { TimelinesStartPlugins, TimelinesUIStart } from './types';
import { useAddToTimeline, useAddToTimelineSensor } from './hooks/use_add_to_timeline';
import { getHoverActions, HoverActionsConfig } from './components/hover_actions';
import { timelineReducer } from './store/timeline/reducer';
import { LastUpdatedAtProps } from './components';

export class TimelinesPlugin implements Plugin<void, TimelinesUIStart> {
  private _store: Store | undefined;
  private _storeUnsubscribe: Unsubscribe | undefined;

  private _hoverActions: HoverActionsConfig | undefined;

  public setup(core: CoreSetup) {}

  public start(core: CoreStart, { data }: TimelinesStartPlugins): TimelinesUIStart {
    return {
      /** `getHoverActions` returns a new reference to `getAddToTimelineButton` each time it is called, but that value is used in dependency arrays and so it should be as stable as possible. Therefore we lazily store the reference to it. Note: this reference is deleted when the store is changed. */
      getHoverActions: () => {
        if (this._hoverActions) {
          return this._hoverActions;
        } else {
          this._hoverActions = getHoverActions(this._store);
          return this._hoverActions;
        }
      },
      getTimelineReducer: () => {
        return timelineReducer;
      },
      getLastUpdated: (props: LastUpdatedAtProps) => {
        return getLastUpdatedLazy(props);
      },
      getUseAddToTimeline: () => {
        return useAddToTimeline;
      },
      getUseAddToTimelineSensor: () => {
        return useAddToTimelineSensor;
      },
      setTimelineEmbeddedStore: (store: Store) => {
        this.setStore(store);
      },
    };
  }

  private setStore(store: Store) {
    this._store = store;
    // this is lazily calculated and that is dependent on the store
    delete this._hoverActions;
  }

  public stop() {
    if (this._storeUnsubscribe) {
      this._storeUnsubscribe();
    }
  }
}
