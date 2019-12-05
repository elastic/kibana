/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { IndexPatterns as IndexPatternsService } from 'src/legacy/core_plugins/data/public';
import { Pipable, StateManager } from '../state_manager';
import { State } from './app_state_manager';
import { SavedObjectStore } from '../persistence';

interface NotificationsStart {
  toasts: { addDanger: (s: string) => void };
}

export type Opts = Pick<StateManager<State>, 'setState'> & {
  state$: Pipable<{ persistedDoc?: { id?: string } }>;
  route$: Pipable<{ docId?: string; redirectTo: (id?: string) => void }>;
  docStorage: SavedObjectStore;
  indexPatternsService: Pick<IndexPatternsService, 'get'>;
  notifications: NotificationsStart;
};

async function loadDocIndexPatterns({
  setState,
  docStorage,
  docId,
  indexPatternsService,
}: Opts & { docId: string }) {
  // TODO: There's a race-condition here which existed in the original
  // code from which this was derived. If the user navigates back and forth
  // from one Lens document to another, we could have several concurrent
  // invocations of this logic, and the last response will win, even if
  // it isn't the current one. We should probably:
  //
  // - not obliterate indexPatternsForTopNav, but rather treat it as a set
  //   which is only added to, and not-refetch any patterns which are already
  //   in the set.
  // - track in-flight requests, and discard all but the current one and the
  //   latest one, and only run the latest one after the current one completes.
  const doc = await docStorage.load(docId);
  const indexPatterns = await Promise.all(
    doc.state.datasourceMetaData.filterableIndexPatterns.map(({ id }) =>
      indexPatternsService.get(id)
    )
  );

  setState(s => ({
    ...s,
    isLoading: false,
    persistedDoc: doc,
    lastKnownDoc: doc,
    query: doc.state.query,
    filters: doc.state.filters,
    indexPatternsForTopNav: indexPatterns,
  }));
}

export function routeChangeLoader(opts: Opts) {
  const { route$, state$, setState, notifications } = opts;

  return combineLatest(route$, state$)
    .pipe(
      map(([{ docId, redirectTo }, state]) => ({
        docId,
        redirectTo,
        currentId: state.persistedDoc && state.persistedDoc.id,
      })),
      distinctUntilChanged((a, b) => a.docId === b.docId && a.currentId === b.currentId)
    )
    .subscribe(({ docId, currentId, redirectTo }) => {
      // TODO: once editor frame state has been moved to the root,
      // this should reset when docId is empty, since it indicates
      // the user has navigated from an "edit" URL to a "new" URL.
      if (!docId || docId === currentId) {
        return;
      }

      setState(s => ({ ...s, isLoading: true }));
      loadDocIndexPatterns({ ...opts, docId }).catch(() => {
        notifications.toasts.addDanger(
          i18n.translate('xpack.lens.app.lensLoadingError', {
            defaultMessage: 'Error loading Lens visualization',
          })
        );
        setState(s => ({ ...s, isLoading: false }));
        redirectTo();
      });
    });
}
