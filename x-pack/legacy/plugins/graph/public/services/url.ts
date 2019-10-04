/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Chrome } from 'ui/chrome';
import { GraphWorkspaceSavedObject } from '../types';
import { MetaDataState } from '../state_management';

export function getHomePath() {
  return '/home';
}

export function getNewPath() {
  return '/workspace';
}

export function getEditPath({ id }: GraphWorkspaceSavedObject) {
  return `/workspace/${id}`;
}

export function getEditUrl(chrome: Chrome, workspace: GraphWorkspaceSavedObject) {
  return chrome.addBasePath(`#${getEditPath(workspace)}`);
}

export type SetBreadcrumbOptions =
  | {
      chrome: Chrome;
    }
  | {
      chrome: Chrome;
      metaData: MetaDataState;
      navigateTo: (path: string) => void;
    };

export function setBreadcrumbs(options: SetBreadcrumbOptions) {
  if ('metaData' in options) {
    options.chrome.breadcrumbs.set([
      {
        text: i18n.translate('xpack.graph.home.breadcrumb', {
          defaultMessage: 'Graph',
        }),
        onClick: () => {
          options.navigateTo(getHomePath());
        },
        'data-test-subj': 'graphHomeBreadcrumb',
      },
      {
        text: options.metaData.title,
        'data-test-subj': 'graphCurrentWorkspaceBreadcrumb',
      },
    ]);
  } else {
    options.chrome.breadcrumbs.set([
      {
        text: i18n.translate('xpack.graph.home.breadcrumb', {
          defaultMessage: 'Graph',
        }),
        href: `#${getHomePath()}`,
        'data-test-subj': 'graphHomeBreadcrumb',
      },
    ]);
  }
}
