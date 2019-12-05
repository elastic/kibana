/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { breadcrumbUpdater } from './breadcrumb_updater';

function testOpts() {
  return {
    state$: new BehaviorSubject<{ persistedDoc?: { title: string } }>({
      persistedDoc: { title: 'heyo!' },
    }),
    chrome: {
      setBreadcrumbs: jest.fn(),
    },
    http: {
      basePath: {
        prepend: jest.fn(x => `TEST${x}`),
      },
    },
  };
}

describe('breadcrumbUpdater', () => {
  it('should update breadcrumbs initially', () => {
    const opts = testOpts();
    breadcrumbUpdater(opts);
    expect(opts.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { href: 'TEST/app/kibana#/visualize', text: 'Visualize' },
      { text: 'heyo!' },
    ]);
  });

  it('should update when the title changes', () => {
    const opts = testOpts();
    breadcrumbUpdater(opts);

    opts.state$.next({ persistedDoc: { title: 'Doohickey...' } });

    expect(opts.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { href: 'TEST/app/kibana#/visualize', text: 'Visualize' },
      { text: 'Doohickey...' },
    ]);
  });

  it('should revert to the empty state if persistedDoc is undefined', () => {
    const opts = testOpts();
    breadcrumbUpdater(opts);

    opts.state$.next({});

    expect(opts.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { href: 'TEST/app/kibana#/visualize', text: 'Visualize' },
      { text: 'Create' },
    ]);
  });

  it('should not update if nothing has changed', () => {
    const opts = testOpts();
    breadcrumbUpdater(opts);

    opts.state$.next({ persistedDoc: { title: 'heyo!' } });

    expect(opts.chrome.setBreadcrumbs).toHaveBeenCalledTimes(1);
  });
});
