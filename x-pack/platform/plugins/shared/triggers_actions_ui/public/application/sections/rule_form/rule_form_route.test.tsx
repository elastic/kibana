/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ProjectRoutingAccess, useRouteBasedCpsPickerAccess } from '@kbn/cps-utils';
import { useKibana } from '../../../common/lib/kibana';
import { RuleFormRoute } from './rule_form_route';

jest.mock('../../../common/lib/kibana');

jest.mock('@kbn/response-ops-rule-form', () => ({
  RuleForm: () => <div />,
  useRuleTemplate: jest
    .fn()
    .mockReturnValue({ data: null, error: null, isLoading: false, isError: false }),
}));

jest.mock('../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: jest.fn(), location: { pathname: '/rules/create' } }),
  useLocation: () => ({ pathname: '/rules/create', state: {} }),
  useParams: () => ({}),
}));

jest.mock('../../lib/breadcrumb', () => ({
  getAlertingSectionBreadcrumb: jest.fn().mockReturnValue({ text: 'Rules' }),
}));

jest.mock('../../lib/doc_title', () => ({
  getCurrentDocTitle: jest.fn().mockReturnValue('Create rule'),
}));

jest.mock('@kbn/cps-utils', () => ({
  ...jest.requireActual('@kbn/cps-utils'),
  useRouteBasedCpsPickerAccess: jest.fn(),
}));
const mockUseRouteBasedCpsPickerAccess = jest.mocked(useRouteBasedCpsPickerAccess);

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="en" messages={{}}>
      {ui}
    </IntlProvider>
  );
}

describe('RuleFormRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
    useKibanaMock().services.chrome = {
      docTitle: { change: jest.fn() },
    } as any;
    useKibanaMock().services.application = {
      ...useKibanaMock().services.application,
      getUrlForApp: jest.fn().mockReturnValue('/app/rules'),
    } as any;
  });

  it('sets the CPS picker access to READONLY', () => {
    renderWithIntl(<RuleFormRoute />);
    expect(mockUseRouteBasedCpsPickerAccess).toHaveBeenCalledWith(
      ProjectRoutingAccess.READONLY,
      expect.any(Object)
    );
  });
});
