/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import type { IntegrationCardItem } from '..';

const mockGetBooleanValue = jest.fn();
const mockGetUrlForApp = jest.fn().mockReturnValue('/app/onboarding/aws');
const mockNavigateToApp = jest.fn();

jest.mock('../../../../../hooks', () => ({
  useStartServices: () => ({
    featureFlags: { useBooleanValue: mockGetBooleanValue },
    application: {
      navigateToApp: mockNavigateToApp,
      getUrlForApp: mockGetUrlForApp,
    },
  }),
}));

import { useOnboardingOverride } from './use_onboarding_override';

const ALL_HIDDEN_NAMES = [
  'aws',
  'aws_bedrock',
  'aws_bedrock_agentcore',
  'aws_billing',
  'aws_cloudwatch_input_otel',
  'aws_logs',
  'aws_mq',
  'aws_securityhub',
  'amazon_security_lake',
  'awsfargate',
  'aws_cloudtrail_otel',
  'aws_ec2_otel',
  'aws_ecs_otel',
  'aws_elb_metrics_otel',
  'aws_elb_otel',
  'aws_lambda_otel',
  'aws_rds_otel',
  'aws_sqs_otel',
  'aws_vpcflow_otel',
  'aws_waf_otel',
];

function makeCard(name: string, id?: string): IntegrationCardItem {
  return {
    id: id ?? `epr:${name}`,
    name,
    title: name,
    description: '',
    icons: [],
    integration: name,
    categories: [],
    url: '',
    version: '',
  };
}

describe('useOnboardingOverride', () => {
  describe('when onboarding is disabled', () => {
    beforeEach(() => mockGetBooleanValue.mockReturnValue(false));

    it('returns cards unchanged', () => {
      const cards = ALL_HIDDEN_NAMES.map((name) => makeCard(name));
      const { result } = renderHook(() => useOnboardingOverride());
      expect(result.current.applyOnboardingOverride(cards)).toBe(cards);
    });

    it('isOnboardingEnabled is false', () => {
      const { result } = renderHook(() => useOnboardingOverride());
      expect(result.current.isOnboardingEnabled).toBe(false);
    });
  });

  describe('when onboarding is enabled', () => {
    beforeEach(() => mockGetBooleanValue.mockReturnValue(true));

    it('filters every hidden name and replaces with single onboarding card', () => {
      const cards = ALL_HIDDEN_NAMES.map((name) => makeCard(name));
      const { result } = renderHook(() => useOnboardingOverride());
      const output = result.current.applyOnboardingOverride(cards);

      expect(output).toHaveLength(1);
      expect(output[0].name).toBe('aws-onboarding');
      expect(output[0].id).toBe('epr:aws');
    });

    it('filters cards whose id is epr:aws (content-package cards)', () => {
      const cards = [makeCard('some-other-aws-package', 'epr:aws')];
      const { result } = renderHook(() => useOnboardingOverride());
      const output = result.current.applyOnboardingOverride(cards);

      expect(output).toHaveLength(1);
      expect(output[0].name).toBe('aws-onboarding');
    });

    it('filters the aws policy template tiles', () => {
      const cards = [makeCard('aws', 'epr:aws-cloudtrail'), makeCard('aws', 'epr:aws-ec2')];
      const { result } = renderHook(() => useOnboardingOverride());
      const output = result.current.applyOnboardingOverride(cards);

      expect(output).toHaveLength(1);
      expect(output[0].name).toBe('aws-onboarding');
    });

    it('preserves non-AWS cards', () => {
      const nonAwsCard = makeCard('elastic_agent', 'epr:elastic_agent');
      const cards = [...ALL_HIDDEN_NAMES.map((name) => makeCard(name)), nonAwsCard];
      const { result } = renderHook(() => useOnboardingOverride());
      const output = result.current.applyOnboardingOverride(cards);

      expect(output).toHaveLength(2);
      expect(output[0].name).toBe('aws-onboarding');
      expect(output[1]).toBe(nonAwsCard);
    });

    it('indexes the hidden tiles on the onboarding tile and lists them as search members', () => {
      const guardduty = {
        ...makeCard('aws', 'epr:aws-guardduty'),
        integration: 'guardduty',
        title: 'Amazon GuardDuty',
        description: 'Collect GuardDuty findings.',
        categories: ['security', 'observability'],
      };
      const guarddutyOtel = {
        ...makeCard('aws_vpcflow_otel', 'epr:aws_vpcflow_otel'),
        title: 'Amazon GuardDuty',
      };
      const { result } = renderHook(() => useOnboardingOverride());
      const [tile] = result.current.applyOnboardingOverride([guarddutyOtel, guardduty]);

      expect(tile.searchableContent).toContain('guardduty');
      expect(tile.searchableContent).toContain('Collect GuardDuty findings.');
      expect(tile.searchMembers).toEqual([{ name: 'guardduty', title: 'Amazon GuardDuty' }]);
      expect(tile.categories).toEqual(['aws', 'security', 'observability']);
    });

    it('leaves OpenTelemetry and content packages out of the search members', () => {
      const real = { ...makeCard('aws', 'epr:aws-cloudtrail'), title: 'AWS CloudTrail' };
      const otel = { ...makeCard('aws_cloudtrail_otel'), title: 'AWS CloudTrail OpenTelemetry' };
      const content = {
        ...makeCard('aws_waf_otel'),
        title: 'AWS WAF OpenTelemetry Assets',
        type: 'content',
      };
      const { result } = renderHook(() => useOnboardingOverride());
      const [tile] = result.current.applyOnboardingOverride([otel, content, real]);

      expect(tile.searchMembers).toEqual([{ name: 'aws', title: 'AWS CloudTrail' }]);
      // Still searchable by their text.
      expect(tile.searchableContent).toContain('AWS WAF OpenTelemetry Assets');
    });

    it('does not list the package-level epr:aws card as a search member', () => {
      const { result } = renderHook(() => useOnboardingOverride());
      const [tile] = result.current.applyOnboardingOverride([makeCard('aws', 'epr:aws')]);

      expect(tile.searchMembers).toEqual([]);
    });

    it('places onboarding tile first', () => {
      const cards = [makeCard('elastic_agent', 'epr:elastic_agent'), makeCard('aws')];
      const { result } = renderHook(() => useOnboardingOverride());
      const output = result.current.applyOnboardingOverride(cards);

      expect(output[0].name).toBe('aws-onboarding');
    });

    it('sends the onboarding tile straight to the onboarding flow with a new session', () => {
      const { result } = renderHook(() => useOnboardingOverride());
      const [tile] = result.current.applyOnboardingOverride([makeCard('aws')]);

      expect(tile.url).toBe('/app/onboarding/aws');
      tile.onCardClick?.();
      expect(mockNavigateToApp).toHaveBeenCalledWith('onboarding', {
        path: '/aws',
        state: { newSession: true },
      });
    });

    it('isOnboardingEnabled is true', () => {
      const { result } = renderHook(() => useOnboardingOverride());
      expect(result.current.isOnboardingEnabled).toBe(true);
    });

    it('navigateToOnboarding starts a new session in the onboarding app', () => {
      const { result } = renderHook(() => useOnboardingOverride());
      result.current.navigateToOnboarding();

      expect(mockNavigateToApp).toHaveBeenCalledWith('onboarding', {
        path: '/aws',
        state: { newSession: true },
      });
    });

    it('exposes the onboarding url for the detail page button', () => {
      const { result } = renderHook(() => useOnboardingOverride());

      expect(result.current.onboardingUrl).toBe('/app/onboarding/aws');
    });
  });
});
