/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, distinctUntilChanged } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { Pipable } from '../state_manager';

export interface Opts {
  state$: Pipable<{ persistedDoc?: { title: string } }>;
  http: { basePath: { prepend: (s: string) => string } };
  chrome: { setBreadcrumbs: (crumbs: Array<{ href?: string; text: string }>) => void };
}

export function breadcrumbUpdater({ state$, http, chrome }: Opts) {
  return state$
    .pipe(
      map(({ persistedDoc }) => persistedDoc && persistedDoc.title),
      distinctUntilChanged((a, b) => a === b)
    )
    .subscribe(title => {
      chrome.setBreadcrumbs([
        {
          href: http.basePath.prepend(`/app/kibana#/visualize`),
          text: i18n.translate('xpack.lens.breadcrumbsTitle', {
            defaultMessage: 'Visualize',
          }),
        },
        {
          text:
            title || i18n.translate('xpack.lens.breadcrumbsCreate', { defaultMessage: 'Create' }),
        },
      ]);
    });
}
