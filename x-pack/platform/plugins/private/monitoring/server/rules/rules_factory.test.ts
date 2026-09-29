/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { RulesFactory } from './rules_factory';
import { RULE_CPU_USAGE } from '../../common/constants';

vi.mock('../static_globals', () => {
      const mocked = {
      Globals: {
        app: {
          getLogger: () => ({ debug: vi.fn() }),
        },
      },
    };
      return { ...mocked, default: mocked };
    });

describe('RulesFactory', () => {
  const rulesClient = {
    find: vi.fn(),
  };

  afterEach(() => {
    rulesClient.find.mockReset();
  });

  it('should get by type', async () => {
    rulesClient.find = vi.fn().mockImplementation(() => {
      return {
        total: 1,
        data: [
          {
            id: 1,
          },
          {
            id: 2,
          },
        ],
      };
    });
    const alerts = await RulesFactory.getByType(RULE_CPU_USAGE, rulesClient as any);
    expect(alerts).not.toBeNull();
    expect(alerts.length).toBe(2);
    expect(alerts[0].getId()).toBe(1);
    expect(alerts[1].getId()).toBe(2);
  });

  it('should pass in the correct filters', async () => {
    let filter = null;
    rulesClient.find = vi.fn().mockImplementation(({ options }) => {
      filter = options.filter;
      return {
        total: 0,
      };
    });
    await RulesFactory.getByType(RULE_CPU_USAGE, rulesClient as any);
    expect(filter).toBe(`alert.attributes.alertTypeId:${RULE_CPU_USAGE}`);
  });
});
