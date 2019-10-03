/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { GraphWorkspaceSavedObject } from '../types';
import { ChromeStart } from 'kibana/public';

export function getHomePath() {
  return '/home';
}

export function getNewPath() {
  return '/workspace';
}

export function getEditPath({ id }: GraphWorkspaceSavedObject) {
  return `/workspace/${id}`;
}

export function getEditUrl(chrome: ChromeStart, workspace: GraphWorkspaceSavedObject) {
  return chrome.addBasePath(`#${getEditPath(workspace)}`);
}

export type SetBreadcrumbOptions =
  | {
      chrome: ChromeStart;
    }
  | {
      chrome: ChromeStart;
      savedWorkspace?: GraphWorkspaceSavedObject;
      navigateTo: (path: string) => void;
    };

export function setBreadcrumbs(options: SetBreadcrumbOptions) {
  if ('savedWorkspace' in options) {
    options.chrome.setBreadcrumbs([
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
        text: options.savedWorkspace
          ? options.savedWorkspace.title
          : i18n.translate('xpack.graph.newWorkspaceTitle', {
              defaultMessage: 'Unsaved workspace',
            }),
        'data-test-subj': 'graphCurrentWorkspaceBreadcrumb',
      },
    ]);
  } else {
    options.chrome.setBreadcrumbs([
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
