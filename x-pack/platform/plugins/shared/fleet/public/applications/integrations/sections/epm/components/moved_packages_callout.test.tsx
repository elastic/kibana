/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { ReplacedPackageMove } from '../../../../../../common/types';

import {
  MovedPackagesCallout,
  getMovedPackageNotices,
  getMovedPackageNoticeText,
} from './moved_packages_callout';

const move: ReplacedPackageMove = {
  package: 'nginx_otel_input',
  title: 'Nginx OpenTelemetry Input',
  version: '0.4.0',
  moved_at: '2026-10-22T00:00:00.000Z',
  package_policies: [
    {
      name: 'nginx-metrics',
      from_id: 'old-1',
      to_id: 'new-1',
      policy_ids: ['agent-policy-1'],
      unmapped_vars: ['nginxreceiver: tls_ca_file'],
    },
  ],
  not_moved: [{ id: 'old-3', name: 'nginx-custom', reason: 'no stream for metrics-custom' }],
};

describe('MovedPackagesCallout', () => {
  const installed = [
    { name: 'nginx_otel', title: 'Nginx OpenTelemetry', installationInfo: { moved_from: [move] } },
    { name: 'redis', title: 'Redis', installationInfo: {} },
  ];

  it('one notice per move, from the replacement installation', () => {
    expect(getMovedPackageNotices(installed)).toEqual([
      { replacementTitle: 'Nginx OpenTelemetry', replacementName: 'nginx_otel', move },
    ]);
  });

  it('adds package names when the old and new titles are the same', () => {
    expect(
      getMovedPackageNoticeText({
        replacementTitle: 'Nginx (OpenTelemetry)',
        replacementName: 'nginx_otel',
        move: { ...move, package: 'nginx_otel_integration', title: 'Nginx (OpenTelemetry)' },
      }).title
    ).toBe(
      'Nginx (OpenTelemetry) (nginx_otel_integration) now lives in Nginx (OpenTelemetry) (nginx_otel)'
    );
  });

  it('says where the package lives now, what moved, what was dropped and what stayed', () => {
    expect(getMovedPackageNoticeText({ replacementTitle: 'Nginx OpenTelemetry', move })).toEqual({
      title: 'Nginx OpenTelemetry Input now lives in Nginx OpenTelemetry',
      moved:
        '1 integration policy moved, with the same agent policies, names and settings: nginx-metrics.',
      unmapped:
        'Settings with no equivalent in Nginx OpenTelemetry, not carried over: nginx-metrics (nginxreceiver: tls_ca_file).',
      notMoved: 'Still on Nginx OpenTelemetry Input: nginx-custom (no stream for metrics-custom).',
    });
  });

  it('renders a callout per notice', () => {
    const result = render(
      <I18nProvider>
        <MovedPackagesCallout notices={getMovedPackageNotices(installed)} />
      </I18nProvider>
    );
    expect(result.getByTestId('movedPackageCallout-nginx_otel_input')).toHaveTextContent(
      'Nginx OpenTelemetry Input now lives in Nginx OpenTelemetry'
    );
  });
});
