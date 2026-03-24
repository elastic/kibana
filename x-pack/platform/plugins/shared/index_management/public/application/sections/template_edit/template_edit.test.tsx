/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMemoryHistory } from 'history';
import { matchPath } from 'react-router-dom';

import type { TemplateDeserialized } from '../../../../common';
import { API_BASE_PATH } from '../../../../common/constants';
import type { AppDependencies } from '../../app_context';
import { AppContextProvider } from '../../app_context';
import { breadcrumbService } from '../../services/breadcrumbs';
import { setUiMetricService } from '../../services/api';
import { getTemplateDetailsLink } from '../../services/routing';
import { sendRequest, useRequest } from '../../services/use_request';
import { TemplateEdit } from './template_edit';
import type { UiMetricService } from '../../services/ui_metric';
import type { UseRequestResponse } from '../../../shared_imports';

jest.mock('../../services/use_request', () => ({
  __esModule: true,
  sendRequest: jest.fn(),
  useRequest: jest.fn(),
}));

jest.mock('../../../shared_imports', () => ({
  PageLoading: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="pageLoading">{children}</div>
  ),
  PageError: ({ 'data-test-subj': dataTestSubj }: { 'data-test-subj'?: string }) => (
    <div data-test-subj={dataTestSubj ?? 'pageError'} />
  ),
  attemptToURIDecode: (value: string) => value,
}));

jest.mock('../../components', () => ({
  __esModule: true,
  TemplateForm: ({
    defaultValue,
    onSave,
  }: {
    defaultValue: TemplateDeserialized;
    onSave: (t: TemplateDeserialized) => void;
  }) => (
    <button
      type="button"
      data-test-subj="mockTemplateFormSave"
      onClick={() => onSave(defaultValue)}
    />
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  const deps = {
    config: {
      enableLegacyTemplates: true,
    },
  } as unknown as AppDependencies;

  return render(
    <I18nProvider>
      <AppContextProvider value={deps}>{ui}</AppContextProvider>
    </I18nProvider>
  );
};

const createRouterProps = ({ name, search = '' }: { name: string; search?: string }) => {
  const history = createMemoryHistory({
    initialEntries: [`/edit_template/${encodeURIComponent(name)}${search}`],
  });
  const match = matchPath<{ name: string }>(history.location.pathname, {
    path: '/edit_template/:name',
    exact: true,
    strict: false,
  });

  if (!match) {
    throw new Error('Expected route to match /edit_template/:name');
  }

  return { history, location: history.location, match };
};

const makeTemplate = (overrides: Partial<TemplateDeserialized> = {}): TemplateDeserialized => ({
  name: 'index_template_without_mappings',
  indexPatterns: ['indexPattern1'],
  version: 1,
  allowAutoCreate: 'NO_OVERWRITE',
  indexMode: 'standard',
  dataStream: {
    hidden: true,
    anyUnknownKey: 'should_be_kept',
  },
  template: {
    lifecycle: {
      enabled: true,
      data_retention: '1d',
    },
  },
  _kbnMeta: {
    type: 'default',
    hasDatastream: true,
    isLegacy: false,
  },
  ...overrides,
});

const getUseRequestMock = <T,>({
  isInitialRequest = false,
  isLoading,
  error,
  data,
}: {
  isInitialRequest?: boolean;
  isLoading: boolean;
  error: Error | null;
  data: T | null;
}): UseRequestResponse<T, Error> => ({
  isInitialRequest,
  isLoading,
  error,
  data,
  resendRequest: jest.fn(),
});

describe('TemplateEdit', () => {
  beforeEach(() => {
    breadcrumbService.setup(jest.fn());
    setUiMetricService({ trackMetric: jest.fn() } as unknown as UiMetricService);
    jest.mocked(sendRequest).mockResolvedValue({ data: null, error: null });
  });

  test('renders loading state', () => {
    jest
      .mocked(useRequest)
      .mockReturnValue(
        getUseRequestMock({ isInitialRequest: true, isLoading: true, error: null, data: null })
      );
    const { history, location, match } = createRouterProps({ name: 'my_template' });

    renderWithProviders(<TemplateEdit match={match} location={location} history={history} />);

    expect(screen.getByTestId('pageLoading')).toBeInTheDocument();
  });

  test('renders error state when load fails', () => {
    jest
      .mocked(useRequest)
      .mockReturnValue(
        getUseRequestMock({ isLoading: false, error: new Error('boom'), data: null })
      );
    const { history, location, match } = createRouterProps({ name: 'my_template' });

    renderWithProviders(<TemplateEdit match={match} location={location} history={history} />);

    expect(screen.getByTestId('sectionError')).toBeInTheDocument();
  });

  test('blocks editing cloud managed templates', () => {
    jest.mocked(useRequest).mockReturnValue(
      getUseRequestMock({
        isLoading: false,
        error: null,
        data: makeTemplate({
          _kbnMeta: { type: 'cloudManaged', hasDatastream: true, isLegacy: false },
        }),
      })
    );
    const { history, location, match } = createRouterProps({ name: 'my_template' });

    renderWithProviders(<TemplateEdit match={match} location={location} history={history} />);

    expect(screen.getByTestId('systemTemplateEditCallout')).toBeInTheDocument();
  });

  test('shows system template warning callout', () => {
    jest.mocked(useRequest).mockReturnValue(
      getUseRequestMock({
        isLoading: false,
        error: null,
        data: makeTemplate({ name: '.system_template' }),
      })
    );
    const { history, location, match } = createRouterProps({ name: '.system_template' });

    renderWithProviders(<TemplateEdit match={match} location={location} history={history} />);

    expect(screen.getByTestId('systemTemplateEditCallout')).toBeInTheDocument();
  });

  test('shows deprecated template warning callout', () => {
    jest.mocked(useRequest).mockReturnValue(
      getUseRequestMock({
        isLoading: false,
        error: null,
        data: makeTemplate({ deprecated: true }),
      })
    );
    const { history, location, match } = createRouterProps({ name: 'my_template' });

    renderWithProviders(<TemplateEdit match={match} location={location} history={history} />);

    expect(screen.getByTestId('deprecatedIndexTemplateCallout')).toBeInTheDocument();
  });

  test('wires save to PUT /index_templates/{name} and navigates', async () => {
    const template = makeTemplate();
    jest
      .mocked(useRequest)
      .mockReturnValue(getUseRequestMock({ isLoading: false, error: null, data: template }));
    const { history, location, match } = createRouterProps({ name: template.name });
    const pushSpy = jest.spyOn(history, 'push');

    renderWithProviders(<TemplateEdit match={match} location={location} history={history} />);

    fireEvent.click(screen.getByTestId('mockTemplateFormSave'));

    await waitFor(() =>
      expect(sendRequest).toHaveBeenCalledWith({
        path: `${API_BASE_PATH}/index_templates/${encodeURIComponent(template.name)}`,
        method: 'put',
        body: JSON.stringify(template),
      })
    );

    expect(pushSpy).toHaveBeenCalledWith(getTemplateDetailsLink(template.name, false));
  });
});
