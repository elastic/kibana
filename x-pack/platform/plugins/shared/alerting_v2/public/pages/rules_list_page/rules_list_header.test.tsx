/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { RulesListHeader } from './rules_list_header';

let mockPhase: 'initialLoad' | 'empty' | 'populated' | 'filtering' | 'filtered' = 'populated';
let mockCanReadV1Rules = true;

jest.mock('@kbn/content-list-provider', () => {
  const actual = jest.requireActual('@kbn/content-list-provider');
  return {
    ...actual,
    useContentListPhase: () => mockPhase,
  };
});

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: string) => {
    const services: Record<string, unknown> = {
      application: {
        capabilities: {
          management: mockCanReadV1Rules
            ? { insightsAndAlerting: { triggersActionsRules: true } }
            : {},
        },
      },
      http: { basePath: { prepend: (path: string) => path } },
    };
    return services[token] ?? {};
  },
  CoreStart: (key: string) => key,
}));

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
