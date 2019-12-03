/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SavedObjectsClientContract } from 'src/core/public';

import { App, AppDeps } from './app';
import { setHttpClient, setSavedObjectsClient } from './lib/api';
import { BootLegacyDependencies } from '../types';

interface BootDeps extends AppDeps {
  element: HTMLElement;
  savedObjects: SavedObjectsClientContract;
  legacy: BootLegacyDependencies;
}

export const boot = (bootDeps: BootDeps) => {
  const { element, legacy, savedObjects, ...appDeps } = bootDeps;
  const { I18nContext, ...appLegacyDeps } = legacy;

  setHttpClient(appDeps.http);
  setSavedObjectsClient(savedObjects);

  render(
    <I18nContext>
      <App {...{ ...appDeps, legacy: appLegacyDeps }} />
    </I18nContext>,
    element
  );
  return () => unmountComponentAtNode(element);
};
