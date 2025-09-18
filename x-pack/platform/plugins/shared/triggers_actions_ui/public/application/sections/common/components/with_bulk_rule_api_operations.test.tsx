/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { v4 as uuidv4 } from 'uuid';
import type { ComponentOpts } from './with_bulk_rule_api_operations';
import { withBulkRuleOperations } from './with_bulk_rule_api_operations';
import type { SortField } from '../../../lib/rule_api/load_execution_log_aggregations';
import type { Rule } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn(),
}));
jest.mock('../../../lib/rule_api/mute', () => ({
  muteRules: jest.fn(),
  muteRule: jest.fn(),
}));
jest.mock('../../../lib/rule_api/unmute', () => ({
  unmuteRules: jest.fn(),
  unmuteRule: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_delete', () => ({
  bulkDeleteRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_enable', () => ({
  bulkEnableRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/bulk_disable', () => ({
  bulkDisableRules: jest.fn(),
}));
jest.mock('../../../lib/rule_api/get_rule', () => ({
  loadRule: jest.fn(),
}));
jest.mock('@kbn/response-ops-rule-form/src/common/apis/resolve_rule', () => ({
  resolveRule: jest.fn(),
}));
jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types', () => ({
  getRuleTypes: jest.fn(),
}));
jest.mock('../../../lib/rule_api/load_action_error_log', () => ({
  loadActionErrorLog: jest.fn(),
}));

const { loadExecutionLogAggregations } = jest.requireMock(
  '../../../lib/rule_api/load_execution_log_aggregations'
);
const { muteRules, muteRule } = jest.requireMock('../../../lib/rule_api/mute');
const { unmuteRules, unmuteRule } = jest.requireMock('../../../lib/rule_api/unmute');
const { bulkDeleteRules } = jest.requireMock('../../../lib/rule_api/bulk_delete');
const { bulkEnableRules } = jest.requireMock('../../../lib/rule_api/bulk_enable');
const { bulkDisableRules } = jest.requireMock('../../../lib/rule_api/bulk_disable');
const { loadRule } = jest.requireMock('../../../lib/rule_api/get_rule');
const { resolveRule } = jest.requireMock(
  '@kbn/response-ops-rule-form/src/common/apis/resolve_rule'
);
const { getRuleTypes } = jest.requireMock('@kbn/response-ops-rules-apis/apis/get_rule_types');
const { loadActionErrorLog } = jest.requireMock('../../../lib/rule_api/load_action_error_log');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('with_bulk_rule_api_operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Minimal helper to build a button that invokes a provided HOC method with optional args
  function invoker(
    methodName: keyof ComponentOpts,
    getArgs?: (props: any) => any,
    label: string = 'call api'
  ) {
    return (props: any) => (
      <button
        data-test-subj={`invoke-${String(methodName)}`}
        onClick={() => {
          const fn = props[methodName];
          const args = getArgs ? getArgs(props) : undefined;
          if (args === undefined) {
            fn();
          } else {
            fn(args);
          }
        }}
      >
        {label}
      </button>
    );
  }

  it('extends any component with RuleApi methods', () => {
    const ComponentToExtend = (props: ComponentOpts) => {
      expect(typeof props.muteRules).toEqual('function');
      expect(typeof props.unmuteRules).toEqual('function');
      expect(typeof props.bulkEnableRules).toEqual('function');
      expect(typeof props.bulkDisableRules).toEqual('function');
      expect(typeof props.bulkDeleteRules).toEqual('function');
      expect(typeof props.muteRule).toEqual('function');
      expect(typeof props.unmuteRule).toEqual('function');
      expect(typeof props.loadRule).toEqual('function');
      expect(typeof props.loadRuleTypes).toEqual('function');
      expect(typeof props.resolveRule).toEqual('function');
      expect(typeof props.loadExecutionLogAggregations).toEqual('function');
      return <div data-test-subj="extended-component" />;
    };

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    render(<ExtendedComponent />);
    expect(screen.getByTestId('extended-component')).toBeInTheDocument();
  });

  it('muteRule calls the muteRule api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('muteRule', (p) => p.rule);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule();
    render(<ExtendedComponent rule={rule} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(muteRule).toHaveBeenCalledTimes(1);
    expect(muteRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('unmuteRule calls the unmuteRule api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('unmuteRule', (p) => p.rule);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule({ muteAll: true });
    render(<ExtendedComponent rule={rule} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(unmuteRule).toHaveBeenCalledTimes(1);
    expect(unmuteRule).toHaveBeenCalledWith({ id: rule.id, http });
  });

  it('enableRule calls the bulkEnableRules api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('bulkEnableRules', (p) => ({ ids: [p.rule.id] }));

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule({ enabled: false });
    render(<ExtendedComponent rule={rule} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(bulkEnableRules).toHaveBeenCalledWith({ ids: [rule.id], http });
  });

  it('disableRule calls the bulkDisableRules api', async () => {
    const { http } = useKibanaMock().services;
    const ComponentToExtend = invoker('bulkDisableRules', (p) => ({
      ids: [p.rule.id],
      untrack: true,
    }));

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rule = mockRule();
    const user = userEvent.setup();

    render(<ExtendedComponent rule={rule} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(bulkDisableRules).toHaveBeenCalledTimes(1);
    expect(bulkDisableRules).toHaveBeenCalledWith({ ids: [rule.id], http, untrack: true });
  });

  it('muteRules calls the muteRules api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('muteRules', (p) => p.rules);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    render(<ExtendedComponent rules={rules} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(muteRules).toHaveBeenCalledTimes(1);
    expect(muteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('unmuteRules calls the unmuteRules api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('unmuteRules', (p) => p.rules);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule({ muteAll: true }), mockRule({ muteAll: true })];
    render(<ExtendedComponent rules={rules} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(unmuteRules).toHaveBeenCalledTimes(1);
    expect(unmuteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('enableRules calls the bulkEnableRules api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('bulkEnableRules', (p) => ({
      ids: p.rules.map((r: Rule) => r.id),
    }));

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [
      mockRule({ enabled: false }),
      mockRule({ enabled: true }),
      mockRule({ enabled: false }),
    ];
    render(<ExtendedComponent rules={rules} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(bulkEnableRules).toHaveBeenCalledWith({
      ids: [rules[0].id, rules[1].id, rules[2].id],
      http,
    });
  });

  it('disableRules calls the bulkDisableRules api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('bulkDisableRules', (p) => ({
      ids: p.rules.map((r: Rule) => r.id),
      untrack: true,
    }));

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    render(<ExtendedComponent rules={rules} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(bulkDisableRules).toHaveBeenCalledTimes(1);
    expect(bulkDisableRules).toHaveBeenCalledWith({
      ids: [rules[0].id, rules[1].id],
      http,
      untrack: true,
    });
  });

  it('bulkDeleteRules calls the bulkDeleteRules api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('bulkDeleteRules', (p) => ({
      ids: [p.rules[0].id, p.rules[1].id],
    }));

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const rules = [mockRule(), mockRule()];
    render(<ExtendedComponent rules={rules} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(bulkDeleteRules).toHaveBeenCalledTimes(1);
    expect(bulkDeleteRules).toHaveBeenCalledWith({ ids: [rules[0].id, rules[1].id], http });
  });

  it('loadRule calls the loadRule api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('loadRule', (p) => p.ruleId);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const ruleId = uuidv4();
    render(<ExtendedComponent ruleId={ruleId} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(loadRule).toHaveBeenCalledTimes(1);
    expect(loadRule).toHaveBeenCalledWith({ ruleId, http });
  });

  it('resolveRule calls the resolveRule api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('resolveRule', (p) => p.ruleId);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    const ruleId = uuidv4();
    render(<ExtendedComponent ruleId={ruleId} />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(resolveRule).toHaveBeenCalledTimes(1);
    expect(resolveRule).toHaveBeenCalledWith({ id: ruleId, http });
  });

  it('loadRuleTypes calls the loadRuleTypes api', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();
    const ComponentToExtend = invoker('loadRuleTypes');

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    render(<ExtendedComponent />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(getRuleTypes).toHaveBeenCalledTimes(1);
    expect(getRuleTypes).toHaveBeenCalledWith({ http });
  });

  it('loadExecutionLogAggregations calls the loadExecutionLogAggregations API', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();

    const sortTimestamp = {
      timestamp: {
        order: 'asc',
      },
    } as SortField;

    const callProps = {
      id: 'test-id',
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      filter: ['success', 'unknown'],
      perPage: 10,
      page: 0,
      sort: [sortTimestamp],
    };

    const ComponentToExtend = invoker('loadExecutionLogAggregations', () => callProps);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    render(<ExtendedComponent />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(loadExecutionLogAggregations).toHaveBeenCalledTimes(1);
    expect(loadExecutionLogAggregations).toHaveBeenCalledWith({
      ...callProps,
      http,
    });
  });

  it('loadActionErrorLog calls the loadActionErrorLog API', async () => {
    const { http } = useKibanaMock().services;
    const user = userEvent.setup();

    const callProps = {
      id: 'test-id',
      dateStart: '2022-03-23T16:17:53.482Z',
      dateEnd: '2022-03-23T16:17:53.482Z',
      filter: ['message: "test"'],
      perPage: 10,
      page: 0,
      sort: [
        {
          timestamp: {
            order: 'asc' as const,
          },
        },
      ],
    };

    const ComponentToExtend = invoker('loadActionErrorLog', () => callProps);

    const ExtendedComponent = withBulkRuleOperations(ComponentToExtend);
    render(<ExtendedComponent />);
    await user.click(screen.getByRole('button', { name: /call api/i }));

    expect(loadActionErrorLog).toHaveBeenCalledTimes(1);
    expect(loadActionErrorLog).toHaveBeenCalledWith({
      ...callProps,
      http,
    });
  });
});

function mockRule(overloads: Partial<Rule> = {}): Rule {
  return {
    id: uuidv4(),
    enabled: true,
    name: `rule-${uuidv4()}`,
    tags: [],
    ruleTypeId: '.noop',
    consumer: 'consumer',
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
    ...overloads,
  };
}
