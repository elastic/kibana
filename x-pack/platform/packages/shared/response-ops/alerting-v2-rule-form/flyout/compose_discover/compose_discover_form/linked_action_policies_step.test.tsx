/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import type { ActionPolicyResponse, MatchedActionPolicy } from '@kbn/alerting-v2-schemas';
import {
  LinkedActionPoliciesMatchingSection,
} from './linked_action_policies_step';
import { CreateActionPolicySecondaryFlyoutProvider } from '../create_action_policy_secondary_flyout_context';
import type { FormValues } from '../../../form/types';

const mockUseMatchedActionPolicies = jest.fn();
const mockUseFindActionPolicies = jest.fn();
const mockOpenCreateActionPolicyFlyout = jest.fn();

jest.mock('./use_matched_action_policies', () => ({
  useMatchedActionPolicies: (params: unknown) => mockUseMatchedActionPolicies(params),
}));

jest.mock('./use_find_action_policies', () => ({
  isCatchAllActionPolicy: (policy: {
    matcher: { tags?: string[] | null; expression?: string | null } | string | null;
  }) => {
    const matcher = policy.matcher;
    if (!matcher) {
      return true;
    }
    if (typeof matcher === 'string') {
      return matcher.trim() === '';
    }
    return !matcher.tags?.length && !matcher.expression?.trim();
  },
  useFindActionPolicies: (params: unknown) => mockUseFindActionPolicies(params),
}));

jest.mock('../../../form/contexts', () => ({
  useRuleFormServices: () => ({
    http: { fetch: jest.fn(), get: jest.fn() },
    CreateActionPolicyFlyout: () => <div data-test-subj="mockCreateActionPolicyFlyout" />,
  }),
}));

jest.mock('../create_action_policy_secondary_flyout_context', () => {
  const actual = jest.requireActual('../create_action_policy_secondary_flyout_context');
  return {
    ...actual,
    useCreateActionPolicySecondaryFlyout: () => ({
      isOpen: false,
      open: mockOpenCreateActionPolicyFlyout,
      close: jest.fn(),
      notifyCreated: jest.fn(),
      options: {},
    }),
  };
});

jest.mock('@kbn/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

const buildMatched = (
  category: MatchedActionPolicy['category'],
  overrides: Partial<MatchedActionPolicy['actionPolicy']> = {}
): MatchedActionPolicy =>
  ({
    category,
    actionPolicy: {
      id: 'policy-1',
      name: 'Policy',
      description: '',
      enabled: true,
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
      matcher: null,
      group_by: null,
      tags: null,
      grouping_mode: 'per_episode',
      throttle: null,
      snoozed_until: null,
      auth: { owner: 'user', created_by_user: true },
      created_by: 'user',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'user',
      updated_at: '2026-01-01T00:00:00.000Z',
      ...overrides,
    },
  }) as MatchedActionPolicy;

const buildFindable = (
  overrides: Partial<ActionPolicyResponse> = {}
): ActionPolicyResponse =>
  ({
    id: 'security-escalation',
    name: 'Security escalation policy',
    description: '',
    enabled: true,
    destinations: [{ type: 'workflow', id: 'Security on-call' }],
    matcher: { expression: '(rule.tags : "security" OR rule.tags : "escalation")' },
    group_by: null,
    tags: null,
    grouping_mode: 'per_episode',
    throttle: null,
    snoozed_until: null,
    auth: { owner: 'user', created_by_user: true },
    created_by: 'user',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_by: 'user',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ActionPolicyResponse;

const Wrapper = ({
  tags = ['production', 'rna'],
  children,
  onTagsChange,
}: {
  tags?: string[];
  children: React.ReactNode;
  onTagsChange?: (tags: string[]) => void;
}) => {
  const methods = useForm<FormValues>({
    defaultValues: {
      metadata: { name: 'Rule', tags, enabled: true },
    } as FormValues,
  });
  const watchedTags = methods.watch('metadata.tags');
  React.useEffect(() => {
    onTagsChange?.(watchedTags ?? []);
  }, [onTagsChange, watchedTags]);
  return (
    <IntlProvider locale="en">
      <CreateActionPolicySecondaryFlyoutProvider>
        <FormProvider {...methods}>{children}</FormProvider>
      </CreateActionPolicySecondaryFlyoutProvider>
    </IntlProvider>
  );
};

describe('LinkedActionPoliciesMatchingSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [],
      total: 0,
    });
    mockUseFindActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [],
      total: 0,
    });
  });

  it('shows matched and catch-all policies from the match API', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildMatched('catch-all', {
          id: 'catch-all',
          name: 'Admin console http error notifications',
        }),
        buildMatched('tags', {
          id: 'tags-and-expression',
          name: 'SRE notifications',
          tags: ['production', 'sre'],
          matcher: { expression: 'episode_status: "active"' },
          destinations: [{ type: 'workflow', id: 'Team SRE notifications' }],
        }),
      ],
      total: 2,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    expect(screen.getByTestId('linkedActionPoliciesMatchingSection')).toBeInTheDocument();
    expect(screen.getByTestId('linkedActionPoliciesMatchCount')).toHaveTextContent(
      'Applied to this rule2'
    );
    expect(screen.getByTestId('linkedActionPolicyCard-catch-all')).toBeInTheDocument();
    expect(screen.getByTestId('linkedActionPolicyCard-tags-and-expression')).toBeInTheDocument();
    expect(screen.getByTestId('linkedActionPoliciesLinkButton')).toBeInTheDocument();
  });

  it('shows no cards when no matching policies exist', () => {
    render(
      <Wrapper tags={[]}>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    expect(screen.getByTestId('linkedActionPoliciesMatchCount')).toHaveTextContent(
      'Applied to this rule0'
    );
    expect(screen.queryByTestId('linkedActionPolicyCard-catch-all')).not.toBeInTheDocument();
  });

  it('shows skeleton placeholders while matched policies are loading', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: true,
      error: null,
      items: [],
      total: 0,
    });

    render(
      <Wrapper tags={[]}>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    expect(screen.getByTestId('linkedActionPoliciesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('linkedActionPoliciesAppliedCards')).not.toBeInTheDocument();
  });

  it('expands with scope, expression, and destination content', async () => {
    const user = userEvent.setup();
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildMatched('tags', {
          id: 'tags-and-expression',
          name: 'SRE notifications',
          tags: ['production', 'sre'],
          matcher: { expression: 'episode_status: "active"' },
          destinations: [{ type: 'workflow', id: 'Team SRE notifications' }],
        }),
      ],
      total: 1,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    await user.click(screen.getByTestId('linkedActionPolicyExpand-tags-and-expression'));
    expect(screen.getByText('Scope:')).toBeInTheDocument();
    expect(screen.getByText('Expression:')).toBeInTheDocument();
    expect(screen.getByText('Destination:')).toBeInTheDocument();
    expect(screen.getByText('Team SRE notifications')).toBeInTheDocument();
  });

  it('toggles expand/collapse', async () => {
    const user = userEvent.setup();
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildMatched('tags', {
          id: 'tags-only',
          name: 'SRE notifications',
          tags: ['production'],
          destinations: [{ type: 'workflow', id: 'On-call SRE channel' }],
        }),
      ],
      total: 1,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    expect(screen.queryByText('On-call SRE channel')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('linkedActionPolicyExpand-tags-only'));
    expect(screen.getByText('On-call SRE channel')).toBeInTheDocument();
  });

  it('lists real policies with tags and excludes catch-all from the link popover', async () => {
    const user = userEvent.setup();
    mockUseFindActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildFindable(),
        buildFindable({
          id: 'catch-all-policy',
          name: 'Catch-all notifications',
          matcher: null,
          tags: null,
        }),
        buildFindable({
          id: 'platform-paging',
          name: 'Platform paging (PagerDuty)',
          tags: null,
          matcher: { expression: '(rule.tags : "platform" OR rule.tags : "paging")' },
        }),
      ],
      total: 3,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    await user.click(screen.getByTestId('linkedActionPoliciesLinkButton'));
    expect(await screen.findByTestId('linkedActionPoliciesLinkSearch')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Security escalation policy/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Platform paging/i })).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();
    expect(screen.getByText('escalation')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Catch-all notifications/i })).not.toBeInTheDocument();
  });

  it('excludes policies that have no rule.tags in their matcher', async () => {
    const user = userEvent.setup();
    mockUseFindActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildFindable({
          id: 'expression-only',
          name: 'Episode status only',
          matcher: { expression: 'episode_status : "active"' },
          tags: ['ignored-metadata-tag'],
        }),
        buildFindable(),
      ],
      total: 2,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    await user.click(screen.getByTestId('linkedActionPoliciesLinkButton'));
    expect(await screen.findByRole('option', { name: /Security escalation policy/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Episode status only/i })).not.toBeInTheDocument();
  });

  it('shows empty state when there are no linkable policies', async () => {
    const user = userEvent.setup();
    mockUseFindActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildFindable({
          id: 'catch-all-only',
          name: 'Always notify',
          matcher: null,
          tags: null,
        }),
      ],
      total: 1,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    await user.click(screen.getByTestId('linkedActionPoliciesLinkButton'));
    expect(await screen.findAllByText('No action policies to link.')).not.toHaveLength(0);
  });

  it('adds policy tags on select; OR match keeps policy applied until all overlapping tags are removed', async () => {
    const user = userEvent.setup();
    const onTagsChange = jest.fn();

    mockUseFindActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [buildFindable()],
      total: 1,
    });

    // Simulate OR matching: any shared tag keeps the policy applied.
    mockUseMatchedActionPolicies.mockImplementation(
      ({ tags }: { tags?: string[] }) => {
        const ruleTags = tags ?? [];
        const matches =
          ruleTags.includes('security') || ruleTags.includes('escalation')
            ? [
                buildMatched('tags', {
                  id: 'security-escalation',
                  name: 'Security escalation policy',
                  tags: ['security', 'escalation'],
                  matcher: { expression: 'rule.tags: "security"' },
                }),
              ]
            : [];
        return { isLoading: false, error: null, items: matches, total: matches.length };
      }
    );

    render(
      <Wrapper onTagsChange={onTagsChange}>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    await user.click(screen.getByTestId('linkedActionPoliciesLinkButton'));
    await user.click(await screen.findByRole('option', { name: /Security escalation policy/i }));
    expect(onTagsChange).toHaveBeenCalledWith(
      expect.arrayContaining(['production', 'rna', 'security', 'escalation'])
    );
    expect(await screen.findByTestId('linkedActionPolicyCard-security-escalation')).toBeInTheDocument();

    // Remove button drops every overlapping tag so OR match can stop.
    await user.click(screen.getByTestId('linkedActionPolicyRemoveTags-security-escalation'));
    const latestTags = onTagsChange.mock.calls.at(-1)?.[0] as string[];
    expect(latestTags).toEqual(expect.arrayContaining(['production', 'rna']));
    expect(latestTags).not.toContain('security');
    expect(latestTags).not.toContain('escalation');
    expect(screen.queryByTestId('linkedActionPolicyCard-security-escalation')).not.toBeInTheDocument();
  });

  it('keeps a multi-tag policy applied when only one overlapping tag remains (OR)', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildMatched('tags', {
          id: 'security-escalation',
          name: 'Security escalation policy',
          tags: ['security', 'escalation'],
        }),
      ],
      total: 1,
    });

    render(
      <Wrapper tags={['production', 'security']}>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    expect(screen.getByTestId('linkedActionPolicyCard-security-escalation')).toBeInTheDocument();
    expect(screen.getByTestId('linkedActionPolicyRemoveTags-security-escalation')).toBeInTheDocument();
  });

  it('does not offer tag removal for catch-all policies', () => {
    mockUseMatchedActionPolicies.mockReturnValue({
      isLoading: false,
      error: null,
      items: [
        buildMatched('catch-all', {
          id: 'catch-all',
          name: 'Admin console http error notifications',
        }),
      ],
      total: 1,
    });

    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    expect(screen.getByTestId('linkedActionPolicyCard-catch-all')).toBeInTheDocument();
    expect(screen.queryByTestId('linkedActionPolicyRemoveTags-catch-all')).not.toBeInTheDocument();
  });

  it('opens the create action policy flyout from the empty text button', async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <LinkedActionPoliciesMatchingSection />
      </Wrapper>
    );

    await user.click(screen.getByTestId('linkedActionPoliciesCreateFlyoutButton'));
    expect(mockOpenCreateActionPolicyFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenCreateActionPolicyFlyout).toHaveBeenCalledWith(expect.any(Function), {
      variant: 'essential',
      ruleTags: ['production', 'rna'],
    });
  });
});
