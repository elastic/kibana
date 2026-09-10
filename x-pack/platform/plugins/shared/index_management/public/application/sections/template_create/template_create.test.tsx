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
import { saveTemplate } from '../../services/api';
import { TemplateCreate } from './template_create';

jest.mock('../../services/api', () => ({
  ...jest.requireActual('../../services/api'),
  saveTemplate: jest.fn(),
}));

const mockUseAppContext = jest.fn();
jest.mock('../../app_context', () => ({
  ...jest.requireActual('../../app_context'),
  useAppContext: () => mockUseAppContext(),
}));

const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockUseLocation(),
}));

let mockTemplateToSave: TemplateDeserialized | null = null;
const mockTemplateFormPropsSpy = jest.fn();

interface TemplateFormMockProps {
  defaultValue?: TemplateDeserialized;
  onSave: (t: TemplateDeserialized) => void;
  title: React.ReactNode;
  isLegacy?: boolean;
}

jest.mock('../../components', () => ({
  __esModule: true,
  TemplateForm: (props: TemplateFormMockProps) => {
    mockTemplateFormPropsSpy(props);
    const { defaultValue, onSave, title } = props;
    return (
      <div>
        <div data-test-subj="mockTemplateFormTitle">{title}</div>
        <div data-test-subj="mockTemplateFormIsLegacy">{String(props.isLegacy)}</div>
        <button
          type="button"
          data-test-subj="mockTemplateFormSave"
          onClick={() =>
            onSave(
              mockTemplateToSave ??
                defaultValue ?? {
                  name: 'new_template',
                  indexPatterns: ['index-*'],
                  dataStream: {},
                  indexMode: 'standard',
                  template: {},
                  allowAutoCreate: 'NO_OVERWRITE',
                  ignoreMissingComponentTemplates: [],
                  composedOf: [],
                  _kbnMeta: { type: 'default', hasDatastream: false, isLegacy: false },
                }
            )
          }
        />
      </div>
    );
  },
}));

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('TemplateCreate', () => {
  beforeEach(() => {
    breadcrumbService.setup(jest.fn());
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockTemplateFormPropsSpy.mockClear();
    mockUseLocation.mockReturnValue({ search: '' });
    mockTemplateToSave = null;
    mockUseAppContext.mockReturnValue({ config: { enableLegacyTemplates: true } });
    const okResponse: Awaited<ReturnType<typeof saveTemplate>> = { data: null, error: null };
    jest.mocked(saveTemplate).mockResolvedValue(okResponse);
  });

  describe('WHEN legacy query param is set and legacy templates are enabled', () => {
    it('SHOULD pass isLegacy=true to TemplateForm', () => {
      mockUseLocation.mockReturnValue({ search: '?legacy=true' });
      const history = createMemoryHistory({ initialEntries: ['/create_template'] });
      const match = matchPath(history.location.pathname, {
        path: '/create_template',
        exact: true,
        strict: false,
      });
      if (!match) {
        throw new Error('Expected route to match /create_template');
      }

      renderWithProviders(
        <TemplateCreate history={history} location={history.location} match={match} />
      );

      expect(screen.getByTestId('mockTemplateFormIsLegacy')).toHaveTextContent('true');
      expect(screen.getByTestId('mockTemplateFormTitle')).toHaveTextContent(
        'Create legacy template'
      );
    });
  });

  describe('WHEN legacy query param is set but legacy templates are disabled', () => {
    it('SHOULD force isLegacy=false', () => {
      mockUseLocation.mockReturnValue({ search: '?legacy=true' });
      mockUseAppContext.mockReturnValue({ config: { enableLegacyTemplates: false } });
      const history = createMemoryHistory({ initialEntries: ['/create_template'] });
      const match = matchPath(history.location.pathname, {
        path: '/create_template',
        exact: true,
        strict: false,
      });
      if (!match) {
        throw new Error('Expected route to match /create_template');
      }

      renderWithProviders(
        <TemplateCreate history={history} location={history.location} match={match} />
      );

      expect(screen.getByTestId('mockTemplateFormIsLegacy')).toHaveTextContent('false');
      expect(screen.getByTestId('mockTemplateFormTitle')).toHaveTextContent('Create template');
    });
  });

  describe('WHEN the form is saved', () => {
    it('SHOULD call saveTemplate and navigate to the template details', async () => {
      const history = createMemoryHistory({ initialEntries: ['/create_template'] });
      const match = matchPath(history.location.pathname, {
        path: '/create_template',
        exact: true,
        strict: false,
      });
      if (!match) {
        throw new Error('Expected route to match /create_template');
      }
      const pushSpy = jest.spyOn(history, 'push');

      const template: TemplateDeserialized = {
        name: 'new_template',
        indexPatterns: ['index-*'],
        dataStream: {},
        indexMode: 'standard',
        template: {},
        allowAutoCreate: 'NO_OVERWRITE',
        ignoreMissingComponentTemplates: [],
        composedOf: [],
        _kbnMeta: { type: 'default', hasDatastream: false, isLegacy: false },
      };

      mockTemplateToSave = template;

      renderWithProviders(
        <TemplateCreate history={history} location={history.location} match={match} />
      );

      fireEvent.click(screen.getByTestId('mockTemplateFormSave'));

      await waitFor(() => {
        expect(saveTemplate).toHaveBeenCalledWith(template);
        expect(pushSpy).toHaveBeenCalledWith(getTemplateDetailsLink(template.name, false));
      });
    });
  });
});
