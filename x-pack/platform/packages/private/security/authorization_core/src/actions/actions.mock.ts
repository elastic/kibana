/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { Actions } from './actions';
import { AiIndexActions } from './ai_index';
import { AlertingActions } from './alerting';
import { AlertsActions } from './alerts';
import { ApiActions } from './api';
import { AppActions } from './app';
import { CasesActions } from './cases';
import { SavedObjectActions } from './saved_object';
import { SpaceActions } from './space';
import { UIActions } from './ui';

vi.mock('./api');
vi.mock('./app');
vi.mock('./saved_object');
vi.mock('./space');
vi.mock('./ui');
vi.mock('./alerting');
vi.mock('./alerts');
vi.mock('./cases');
vi.mock('./ai_index');

const create = (versionNumber: string) => {
  const t = {
    aiIndex: new AiIndexActions(),
    alerts: new AlertsActions(),
    api: new ApiActions(),
    app: new AppActions(),
    login: 'login:',
    savedObject: new SavedObjectActions(),
    alerting: new AlertingActions(),
    cases: new CasesActions(),
    space: new SpaceActions(),
    ui: new UIActions(),
  } as unknown as Mocked<Actions>;
  return t;
};

export const actionsMock = { create };
