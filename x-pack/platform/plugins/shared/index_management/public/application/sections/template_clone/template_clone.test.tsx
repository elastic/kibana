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
import { breadcrumbService } from '../../services/breadcrumbs';
import { getTemplateDetailsLink } from '../../services/routing';
import { saveTemplate, useLoadIndexTemplate } from '../../services/api';
import { TemplateClone } from './template_clone';
import type { UseRequestResponse, Error as EsUiSharedError } from '../../../shared_imports';

jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  saveTemplate: jest.fn(),
  useLoadIndexTemplate: jest.fn(),
}));

jest.mock('../../app_context', () => ({
  ...jest.requireActual('../../app_context'),
  useAppContext: jest.fn(() => ({
    config: { enableLegacyTemplates: true },
  })),
}));

interface TemplateFormMockProps {
  defaultValue: TemplateDeserialized;
  onSave: (t: TemplateDeserialized) => void;
  title: React.ReactNode;
}

const mockTemplateFormPropsSpy = jest.fn();
jest.mock('../../components', () => ({
  __esModule: true,
  TemplateForm: (props: TemplateFormMockProps) => {
    mockTemplateFormPropsSpy(props);
    const { defaultValue, onSave, title } = props;
    return (
      <div>
        <div data-test-subj="mockTemplateFormTitle">{title}</div>
        <div data-test-subj="mockTemplateFormDefaultName">{defaultValue?.name}</div>
        <button
          type="button"
          data-test-subj="mockTemplateFormSave"
          onClick={() => onSave(defaultValue)}
        />
      </div>
    );
  },
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

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

const createRouterProps = ({ name, search = '' }: { name: string; search?: string }) => {
  const history = createMemoryHistory({
    initialEntries: [`/clone_template/${encodeURIComponent(name)}${search}`],
  });
  const match = matchPath<{ name: string }>(history.location.pathname, {
    path: '/clone_template/:name',
    exact: true,
    strict: false,
  });

  if (!match) {
    throw new Error('Expected route to match /clone_template/:name');
  }

  return { history, location: history.location, match };
};

const makeTemplate = (overrides: Partial<TemplateDeserialized> = {}): TemplateDeserialized => ({
  name: 'my_template',
  indexPatterns: ['indexPattern1'],
  version: 1,
  allowAutoCreate: 'NO_OVERWRITE',
  indexMode: 'standard',
  dataStream: {},
  template: {},
  ignoreMissingComponentTemplates: [],
  composedOf: [],
  _kbnMeta: {
    type: 'default',
    hasDatastream: false,
    isLegacy: false,
  },
  ...overrides,
});

const createRequestError = (message: string): EsUiSharedError => ({ error: message, message });

const getUseRequestMock = <T,>({
  isInitialRequest = false,
  isLoading,
  error,
  data,
}: {
  isInitialRequest?: boolean;
  isLoading: boolean;
  error: EsUiSharedError | null;
  data: T | null;
}): UseRequestResponse<T, EsUiSharedError> => ({
  isInitialRequest,
  isLoading,
  error,
  data,
  resendRequest: jest.fn(),
});

describe('TemplateClone', () => {
  beforeEach(() => {
    breadcrumbService.setup(jest.fn());
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockTemplateFormPropsSpy.mockClear();
    const okResponse: Awaited<ReturnType<typeof saveTemplate>> = { data: null, error: null };
    jest.mocked(saveTemplate).mockResolvedValue(okResponse);
  });

  describe('WHEN the template is loading', () => {
    it('SHOULD render the loading state', () => {
      jest
        .mocked(useLoadIndexTemplate)
        .mockReturnValue(
          getUseRequestMock<TemplateDeserialized>({ isLoading: true, error: null, data: null })
        );

      const { history, location, match } = createRouterProps({ name: 'my_template' });
      renderWithProviders(<TemplateClone match={match} location={location} history={history} />);

      expect(screen.getByTestId('pageLoading')).toBeInTheDocument();
    });
  });

  describe('WHEN the template load fails', () => {
    it('SHOULD render the error state', () => {
      jest.mocked(useLoadIndexTemplate).mockReturnValue(
        getUseRequestMock<TemplateDeserialized>({
          isLoading: false,
          error: createRequestError('boom'),
          data: null,
        })
      );

      const { history, location, match } = createRouterProps({ name: 'my_template' });
      renderWithProviders(<TemplateClone match={match} location={location} history={history} />);

      expect(screen.getByTestId('sectionError')).toBeInTheDocument();
    });
  });

  describe('WHEN the template is loaded successfully', () => {
    it('SHOULD set the cloned default name and wire save with clone flag', async () => {
      const template = makeTemplate({
        name: 'my_template',
        indexPatterns: ['index-1', 'index-2'],
        version: 7,
        allowAutoCreate: 'TRUE',
        indexMode: 'standard',
        template: { settings: { index: { number_of_shards: 1 } } },
      });
      jest
        .mocked(useLoadIndexTemplate)
        .mockReturnValue(getUseRequestMock({ isLoading: false, error: null, data: template }));

      const { history, location, match } = createRouterProps({ name: template.name });
      const pushSpy = jest.spyOn(history, 'push');

      renderWithProviders(<TemplateClone match={match} location={location} history={history} />);

      expect(await screen.findByTestId('mockTemplateFormDefaultName')).toHaveTextContent(
        `${template.name}-copy`
      );
      expect(screen.getByTestId('mockTemplateFormTitle')).toHaveTextContent(
        `Clone template '${template.name}'`
      );

      fireEvent.click(screen.getByTestId('mockTemplateFormSave'));

      await waitFor(() => {
        expect(saveTemplate).toHaveBeenCalledTimes(1);
      });

      const [savedTemplate, cloneFlag] = jest.mocked(saveTemplate).mock.calls[0];

      expect(savedTemplate).toEqual({
        ...template,
        name: `${template.name}-copy`,
      });
      expect(cloneFlag).toBe(true);

      await waitFor(() => {
        expect(pushSpy).toHaveBeenCalledWith(getTemplateDetailsLink(savedTemplate.name, false));
      });
    });
  });
});
