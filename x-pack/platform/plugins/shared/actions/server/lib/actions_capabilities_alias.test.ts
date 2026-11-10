/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, KibanaRequest } from '@kbn/core/server';
import {
  ACTIONS_UI_CAPABILITIES,
  actionsCapabilitiesProvider,
  actionsCapabilitiesSwitcher,
} from './actions_capabilities_alias';

const request = {} as KibanaRequest;

const baseCapabilities = (): Capabilities => ({
  navLinks: {},
  management: {},
  catalogue: {},
});

describe('actions capabilities alias', () => {
  test('provider registers every actions ui capability as false', () => {
    expect(actionsCapabilitiesProvider()).toEqual({
      actions: {
        show: false,
        execute: false,
        save: false,
        delete: false,
        endpointSecurityExecute: false,
      },
    });
    expect(ACTIONS_UI_CAPABILITIES).toEqual([
      'show',
      'execute',
      'save',
      'delete',
      'endpointSecurityExecute',
    ]);
  });

  test('switcher mirrors actions_v2 values', () => {
    const capabilities: Capabilities = {
      ...baseCapabilities(),
      actions_v2: {
        show: true,
        execute: false,
        save: true,
        delete: false,
        endpointSecurityExecute: true,
      },
    };

    expect(actionsCapabilitiesSwitcher(request, capabilities, false)).toEqual({
      actions: {
        show: true,
        execute: false,
        save: true,
        delete: false,
        endpointSecurityExecute: true,
      },
    });
  });

  test('switcher returns an empty object when actions_v2 is missing', () => {
    expect(actionsCapabilitiesSwitcher(request, baseCapabilities(), false)).toEqual({});
  });
});
