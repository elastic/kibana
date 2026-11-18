/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { Alert } from '@kbn/alerting-types';
import type { AlertFormatter } from '@kbn/alerts-ui-shared';
import { useViewInAppUrl } from './use_view_in_app_url';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

jest.mock('../contexts/alerts_table_context');

const mockUseAlertsTableContext = useAlertsTableContext as jest.MockedFunction<
  typeof useAlertsTableContext
>;

const RULE_TYPE_ID = 'apm.error_rate';
const prepend = (path: string) => `/s/space${path}`;

const makeAlert = (fields: Record<string, unknown[]>): Alert => fields as unknown as Alert;

describe('useViewInAppUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAlertsTableContext.mockReturnValue({
      services: { http: { basePath: { prepend } } },
    } as unknown as ReturnType<typeof useAlertsTableContext>);
  });

  it('returns null when the alert has no rule type id', () => {
    const formatter: AlertFormatter = jest.fn(() => ({ reason: '', link: '/app/apm' }));
    const { result } = renderHook(() => useViewInAppUrl(makeAlert({}), () => formatter));

    expect(result.current).toBeNull();
    expect(formatter).not.toHaveBeenCalled();
  });

  it('returns null when no formatter getter is provided', () => {
    const { result } = renderHook(() =>
      useViewInAppUrl(makeAlert({ [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID] }), undefined)
    );

    expect(result.current).toBeNull();
  });

  it('returns null when the rule type has no formatter', () => {
    const { result } = renderHook(() =>
      useViewInAppUrl(makeAlert({ [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID] }), () => undefined)
    );

    expect(result.current).toBeNull();
  });

  it('returns null when the formatter returns no link', () => {
    const { result } = renderHook(() =>
      useViewInAppUrl(makeAlert({ [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID] }), () => () => ({
        reason: 'reason',
      }))
    );

    expect(result.current).toBeNull();
  });

  it('returns null when the formatter throws', () => {
    const { result } = renderHook(() =>
      useViewInAppUrl(makeAlert({ [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID] }), () => () => {
        throw new Error('boom');
      })
    );

    expect(result.current).toBeNull();
  });

  it('prepends the base path when the link does not include it', () => {
    const { result } = renderHook(() =>
      useViewInAppUrl(makeAlert({ [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID] }), () => () => ({
        reason: '',
        link: '/app/apm/services/opbeans',
      }))
    );

    expect(result.current).toBe('/s/space/app/apm/services/opbeans');
  });

  it('returns the link unchanged when it already includes the base path', () => {
    const { result } = renderHook(() =>
      useViewInAppUrl(makeAlert({ [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID] }), () => () => ({
        reason: '',
        link: '/s/space/app/apm/services/opbeans',
        hasBasePath: true,
      }))
    );

    expect(result.current).toBe('/s/space/app/apm/services/opbeans');
  });

  it('passes the first value of each array field to the formatter', () => {
    const formatter: AlertFormatter = jest.fn(() => ({ reason: '', link: '/app/apm' }));

    renderHook(() =>
      useViewInAppUrl(
        makeAlert({
          [ALERT_RULE_TYPE_ID]: [RULE_TYPE_ID],
          'service.name': ['opbeans-java', 'ignored'],
        }),
        () => formatter
      )
    );

    expect(formatter).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: { [ALERT_RULE_TYPE_ID]: RULE_TYPE_ID, 'service.name': 'opbeans-java' },
      })
    );
  });
});
