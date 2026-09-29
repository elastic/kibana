/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { docLinksServiceMock } from '@kbn/core/public/mocks';

import type { AppDependencies } from '../../app_context';
import { AppContextProvider } from '../../app_context';
import { getMatchingDataStreams, getMatchingIndices } from '../../services/api';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../services/breadcrumbs';
import { documentationService } from '../../services/documentation';
import { EnrichPolicyCreate } from './enrich_policy_create';

// `services/documentation` reaches `@kbn/monaco` through the mappings editor constants and the
// runtime fields plugin. Only the ES|QL/Painless language registration is loaded there, and that
// pulls in every generated definition plus their i18n messages at import time.
vi.mock('@kbn/monaco', () => {
  const mocked = { PainlessLang: { ID: 'painless' } };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/code-editor', () => {
  const mocked = {
    // A plain textarea stands in for Monaco; loading the real module drags in every Monaco language.
    CodeEditor: ({ value }: { value?: string }) => (
      <textarea data-test-subj="mockCodeEditor" value={value ?? ''} readOnly />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../services/api', async () => {
  const mocked = {
    ...(await vi.importActual('../../services/api')),
    getMatchingDataStreams: vi.fn(),
    getMatchingIndices: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// `EnrichPolicyCreate` is typed as a route component but reads nothing from the route.
const routeProps = {} as RouteComponentProps;

const renderEnrichPolicyCreate = async () => {
  const appDependencies = {
    core: { application: { getUrlForApp: vi.fn() } },
    history: { push: vi.fn() },
    services: { notificationService: { showSuccessToast: vi.fn() } },
  } as unknown as AppDependencies;

  render(
    <I18nProvider>
      <MockAppHeaderProvider>
        <AppContextProvider value={appDependencies}>
          <EnrichPolicyCreate {...routeProps} />
        </AppContextProvider>
      </MockAppHeaderProvider>
    </I18nProvider>
  );
  // The configuration step loads its source options on mount; settle that update first.
  await act(async () => {});
};

describe('<EnrichPolicyCreate />', () => {
  beforeAll(() => {
    vi.spyOn(breadcrumbService, 'setBreadcrumbs').mockImplementation(() => {});
    documentationService.setup(docLinksServiceMock.createStartContract());
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMatchingIndices).mockResolvedValue({ data: { indices: [] }, error: null });
    vi.mocked(getMatchingDataStreams).mockResolvedValue({ data: { dataStreams: [] }, error: null });
  });

  describe('WHEN the page is rendered', () => {
    it('SHOULD set the breadcrumbs and the header title', async () => {
      await renderEnrichPolicyCreate();

      expect(breadcrumbService.setBreadcrumbs).toHaveBeenCalledWith(
        IndexManagementBreadcrumb.enrichPoliciesCreate
      );
      expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
        'Create enrich policy'
      );
    });

    it('SHOULD link to the create enrich policy documentation', async () => {
      await renderEnrichPolicyCreate();

      await openAppMenuOverflow();

      expect(await screen.findByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
        'href',
        documentationService.getCreateEnrichPolicyLink()
      );
    });

    it('SHOULD start the wizard on the configuration step', async () => {
      await renderEnrichPolicyCreate();

      expect(screen.getByTestId('configurationForm')).toBeInTheDocument();
    });
  });
});
