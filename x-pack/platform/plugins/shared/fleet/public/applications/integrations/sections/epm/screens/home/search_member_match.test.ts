/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardItem } from './card_utils';
import { withSearchMemberMatch } from './search_member_match';

const awsCard: IntegrationCardItem = {
  id: 'epr:aws',
  name: 'aws-onboarding',
  title: 'Amazon Web Services',
  description: 'Collect logs and metrics from Amazon Web Services (AWS).',
  icons: [],
  integration: 'aws',
  categories: ['aws'],
  url: '',
  version: '',
  searchMembers: [
    { name: 'guardduty', title: 'Amazon GuardDuty' },
    { name: 'cloudtrail', title: 'AWS CloudTrail' },
    { name: 'vpcflow', title: 'AWS VPC Flow Logs' },
  ],
};

describe('withSearchMemberMatch', () => {
  it.each([undefined, '', '   '])('returns the card untouched without a term (%p)', (term) => {
    expect(withSearchMemberMatch(awsCard, term)).toBe(awsCard);
  });

  it('returns cards without searchMembers untouched', () => {
    const card = { ...awsCard, searchMembers: undefined };
    expect(withSearchMemberMatch(card, 'guardduty')).toBe(card);
  });

  it.each(['aws', 'amazon', 'web serv'])(
    'keeps the generic description when the term matches the card itself (%s)',
    (term) => {
      expect(withSearchMemberMatch(awsCard, term)).toBe(awsCard);
    }
  );

  it.each(['guardduty', 'guard', 'GuardDuty'])('matches a member by title prefix (%s)', (term) => {
    expect(withSearchMemberMatch(awsCard, term).searchMemberMatch).toEqual({
      memberTitles: ['Amazon GuardDuty'],
      collectionTitle: 'Amazon Web Services',
    });
  });

  it('matches several tokens against the same member', () => {
    expect(withSearchMemberMatch(awsCard, 'vpc flow').searchMemberMatch?.memberTitles).toEqual([
      'AWS VPC Flow Logs',
    ]);
  });

  it('matches on the member name when the title does not contain the term', () => {
    expect(withSearchMemberMatch(awsCard, 'vpcflow').searchMemberMatch?.memberTitles).toEqual([
      'AWS VPC Flow Logs',
    ]);
  });

  it('lists every matching member, in member order', () => {
    const card = {
      ...awsCard,
      searchMembers: [
        { name: 'cloudtrail', title: 'AWS CloudTrail' },
        { name: 'guardduty', title: 'Amazon GuardDuty' },
        { name: 'cloudwatch', title: 'AWS CloudWatch' },
        { name: 'cloudfront', title: 'Amazon CloudFront' },
      ],
    };
    expect(withSearchMemberMatch(card, 'cloud').searchMemberMatch).toEqual({
      memberTitles: ['AWS CloudTrail', 'AWS CloudWatch', 'Amazon CloudFront'],
      collectionTitle: 'Amazon Web Services',
    });
  });

  it('leaves the card untouched when no member matches', () => {
    expect(withSearchMemberMatch(awsCard, 'nginx')).toBe(awsCard);
  });

  describe('collection cards', () => {
    const member = (name: string, title: string): IntegrationCardItem => ({
      ...awsCard,
      id: `epr:${name}`,
      name,
      title,
      searchMembers: undefined,
    });
    const nginxCollection: IntegrationCardItem = {
      ...awsCard,
      id: 'collection:nginx',
      name: 'nginx',
      title: 'Nginx',
      searchMembers: undefined,
      isCollectionCard: true,
      groupMembers: [
        member('nginx', 'Nginx'),
        member('nginx_otel', 'Nginx (OpenTelemetry)'),
        member('nginx_ingress_controller', 'Nginx Ingress Controller'),
      ],
    };

    it('names the member the term matched', () => {
      expect(withSearchMemberMatch(nginxCollection, 'ingress').searchMemberMatch).toEqual({
        memberTitles: ['Nginx Ingress Controller'],
        collectionTitle: 'Nginx',
      });
    });

    it('lists every matching member', () => {
      const prometheus: IntegrationCardItem = {
        ...nginxCollection,
        id: 'collection:prometheus',
        name: 'prometheus',
        title: 'Prometheus',
        groupMembers: [
          member('prometheus', 'Prometheus Metrics Scraping'),
          member('prometheus_otel', 'OpenTelemetry Collector Metrics'),
          member('prometheus_logs', 'Prometheus Logs'),
        ],
      };

      expect(withSearchMemberMatch(prometheus, 'metrics').searchMemberMatch).toEqual({
        memberTitles: ['Prometheus Metrics Scraping', 'OpenTelemetry Collector Metrics'],
        collectionTitle: 'Prometheus',
      });
    });

    it('keeps the generic description when the term matches the collection itself', () => {
      expect(withSearchMemberMatch(nginxCollection, 'nginx')).toBe(nginxCollection);
    });

    it('leaves a plain card without members untouched', () => {
      const plain = { ...awsCard, searchMembers: undefined };
      expect(withSearchMemberMatch(plain, 'guardduty')).toBe(plain);
    });
  });
});
