/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { SavedObjectsClientContract } from 'src/core/public';

import { App, AppDeps } from './app';
import { setSavedObjectsClient } from '../application/components/builtin_alert_types/threshold/lib/api';
import { LegacyDependencies } from '../types';

interface BootDeps extends AppDeps {
  element: HTMLElement;
  savedObjects: SavedObjectsClientContract;
  I18nContext: any;
  legacy: LegacyDependencies;
}

export const boot = (bootDeps: BootDeps) => {
  const { I18nContext, element, legacy, savedObjects, ...appDeps } = bootDeps;

  setSavedObjectsClient(savedObjects);

  render(
    <I18nContext>
      <App {...appDeps} legacy={legacy} />
    </I18nContext>,
    element
  );
  return () => unmountComponentAtNode(element);
};
