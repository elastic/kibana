/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { ALERTING_V2_RULES_BASE_PATH } from '@kbn/alerting-v2-constants';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RulesListHeader } from './rules_list_header';

let mockPhase: 'initialLoad' | 'empty' | 'populated' | 'filtering' | 'filtered' = 'populated';
let mockCanReadV1Rules = true;

/** Non-empty so the assertions below prove each href is run through `basePath.prepend`. */
const MOCK_BASE_PATH = '/mock-base';

jest.mock('@kbn/content-list-provider', () => {
  const actual = jest.requireActual('@kbn/content-list-provider');
  return {
    ...actual,
    useContentListPhase: () => mockPhase,
  };
});

jest.mock('@kbn/core-di-browser', () => {
  const actual = jest.requireActual('@kbn/core-di-browser');
  return {
    ...actual,
    useService: (token: symbol) => {
      if (token === actual.CoreStart('application')) {
        return {
          capabilities: {
            management: mockCanReadV1Rules
              ? { insightsAndAlerting: { triggersActionsRules: true } }
              : {},
          },
        };
      }

      if (token === actual.CoreStart('http')) {
        return { basePath: { prepend: (path: string) => `${MOCK_BASE_PATH}${path}` } };
      }

      return {};
    },
  };
});

const onCreateRule = jest.fn();
const onCreateEsqlRule = jest.fn();
const onCreateWithAgent = jest.fn();
const onBuildSequence = jest.fn();

const renderHeader = (props?: Partial<React.ComponentProps<typeof RulesListHeader>>) =>
  render(
    <ListPageTestProviders>
      <RulesListHeader
        canWrite={true}
        onCreateRule={onCreateRule}
        onCreateEsqlRule={onCreateEsqlRule}
        onCreateWithAgent={onCreateWithAgent}
        onBuildSequence={onBuildSequence}
        {...props}
      />
    </ListPageTestProviders>
  );

describe('RulesListHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPhase = 'populated';
    mockCanReadV1Rules = true;
  });

  it('renders the page title and experimental badge', () => {
    renderHeader();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Rules');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('renders V1 rules and V2 rules tabs with V2 selected', async () => {
    renderHeader();

    const v1Tab = await screen.findByTestId('v1RulesTab');
    const v2Tab = await screen.findByTestId('v2RulesTab');

    expect(v1Tab).toHaveAttribute('aria-selected', 'false');
    expect(v2Tab).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findAllByRole('tab')).toHaveLength(2);
  });

  it('orders the V2 rules tab before the V1 rules tab', async () => {
    renderHeader();

    const tabs = await screen.findAllByRole('tab');

    expect(tabs.map((tab) => tab.getAttribute('data-test-subj'))).toEqual([
      'v2RulesTab',
      'v1RulesTab',
    ]);
  });

  it('points each tab at its own app, under the server base path', async () => {
    renderHeader();

    expect(await screen.findByTestId('v2RulesTab')).toHaveAttribute(
      'href',
      `${MOCK_BASE_PATH}${ALERTING_V2_RULES_BASE_PATH}`
    );
    expect(await screen.findByTestId('v1RulesTab')).toHaveAttribute(
      'href',
      `${MOCK_BASE_PATH}${triggersActionsRoute}`
    );
  });

  it('hides the tab strip when the user cannot read the v1 Rules page', () => {
    mockCanReadV1Rules = false;
    renderHeader();

    expect(screen.queryByTestId('v1RulesTab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('v2RulesTab')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('renders the tabs even in the true empty state, unlike the create menu', () => {
    mockPhase = 'empty';
    renderHeader();

    expect(screen.getByTestId('v1RulesTab')).toBeInTheDocument();
    expect(screen.getByTestId('v2RulesTab')).toBeInTheDocument();
    expect(screen.queryByTestId('createRuleButton')).not.toBeInTheDocument();
  });
});
