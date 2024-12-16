/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import { telemetryServiceMock } from '../telemetry/mocks/service';

export const mockServices = {
  ...coreMock.createStart(),
  triggersActionsUi: triggersActionsUiMock.createStart(),
  licensing: licensingMock.createStart(),
  telemetry: telemetryServiceMock.createStart(),
  renderUpselling$: of(undefined),
};
