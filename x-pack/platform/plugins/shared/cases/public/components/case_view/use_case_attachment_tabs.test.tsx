/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { caseData } from './mocks';

import { CASE_VIEW_PAGE_TABS } from '../../../common/types';
import type { CaseViewTabsProps } from './case_view_tabs';
import { useCaseAttachmentTabs } from './use_case_attachment_tabs';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import React from 'react';

import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

const platinumLicense = licensingMock.createLicense({
  license: { type: 'platinum' },
});

jest.mock('./use_case_observables', () => ({
  useCaseObservables: () => ({
    observables: [],
    isLoading: false,
  }),
}));

export const caseProps: CaseViewTabsProps = {
  caseData,
  activeTab: CASE_VIEW_PAGE_TABS.ACTIVITY,
};

export const casePropsWithAlerts: CaseViewTabsProps = {
  ...caseProps,
  caseData: { ...caseData, totalAlerts: 3 },
};

export const casePropsWithEvents: CaseViewTabsProps = {
  ...caseProps,
  caseData: { ...caseData, totalEvents: 4 },
};

describe('useCaseAttachmentTabs()', () => {
  it('returns basic case attachment tabs', async () => {
    const { result } = renderHook(
      () => {
        return useCaseAttachmentTabs({ caseData, activeTab: CASE_VIEW_PAGE_TABS.ALERTS });
      },
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    expect(result.current.map((tab) => tab.id)).toMatchInlineSnapshot(`
      Array [
        "alerts",
        "files",
      ]
    `);
  });

  it('returns attachment tabs based on enable features an license', async () => {
    const { result } = renderHook(
      () => {
        return useCaseAttachmentTabs({ caseData, activeTab: CASE_VIEW_PAGE_TABS.ALERTS });
      },
      {
        wrapper: ({ children }) => (
          <TestProviders
            features={{
              alerts: { enabled: true },
              events: { enabled: true },
              observables: { enabled: true },
            }}
            license={platinumLicense}
          >
            {children}
          </TestProviders>
        ),
      }
    );

    expect(result.current.map((tab) => tab.id)).toMatchInlineSnapshot(`
      Array [
        "alerts",
        "events",
        "files",
        "observables",
      ]
    `);
  });
});
