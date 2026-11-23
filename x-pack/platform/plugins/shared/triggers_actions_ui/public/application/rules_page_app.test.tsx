/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { ScopedHistory } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { createStartServicesMock } from '../common/lib/kibana/kibana_react.mock';
import type { TriggersAndActionsUiServices } from './rules_app';
import { RulesPageApp } from './rules_page_app';

const mockOnRuleDetailsMount = jest.fn();

jest.mock('./sections/rule_details/components/rule_details_route_wrapper', () => {
  const MockRuleDetailsRouteWrapper = () => {
    useEffect(() => {
      mockOnRuleDetailsMount();
    }, []);
    return <div data-test-subj="ruleDetailsRouteWrapper" />;
  };
  return { __esModule: true, default: MockRuleDetailsRouteWrapper };
});

jest.mock('./sections/rules_page/rules_page_container', () => ({
  __esModule: true,
  default: () => <div data-test-subj="rulesPageContainer" />,
}));

jest.mock('./sections/rule_form/rule_form_route', () => ({
  __esModule: true,
  default: () => <div data-test-subj="ruleFormRoute" />,
}));

jest.mock('@kbn/ebt-tools', () => ({
  PerformanceContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('../locators/bind_locator_to_host', () => ({
  getLocators: () => ({}),
}));

const createDeps = (): TriggersAndActionsUiServices => ({
  ...createStartServicesMock(),
  share: {} as SharePluginStart,
  history: createMemoryHistory({
    initialEntries: ['/rule/rule-1'],
  }) as unknown as ScopedHistory,
});

describe('RulesPageApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the matched route mounted when re-rendered with new deps', async () => {
    const deps = createDeps();
    const { rerender } = render(<RulesPageApp deps={deps} />);

    expect(await screen.findByTestId('ruleDetailsRouteWrapper')).toBeInTheDocument();

    rerender(<RulesPageApp deps={{ ...deps }} />);
    rerender(<RulesPageApp deps={{ ...deps, kibanaFeatures: [] }} />);

    expect(await screen.findByTestId('ruleDetailsRouteWrapper')).toBeInTheDocument();
    expect(mockOnRuleDetailsMount).toHaveBeenCalledTimes(1);
  });
});
