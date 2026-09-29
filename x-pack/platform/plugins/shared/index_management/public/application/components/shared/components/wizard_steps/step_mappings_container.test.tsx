/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { docLinksServiceMock, httpServiceMock } from '@kbn/core/public/mocks';

import { API_BASE_PATH } from '../../../../../../common/constants';
import { AppContextProvider, type AppDependencies } from '../../../../app_context';
import { httpService } from '../../../../services/http';
import { MappingsEditor } from '../../../mappings_editor';
import { documentationService } from '../../../mappings_editor/shared_imports';
import { StepMappingsContainer } from './step_mappings_container';

vi.mock('../../../../../shared_imports', async () => {
  const actual = (await vi.importActual('../../../../../shared_imports'));
  return {
    ...actual,
    Forms: {
      useContent: vi.fn(() => ({
        defaultValue: {},
        updateContent: vi.fn(),
        getSingleContentData: vi.fn(),
      })),
      useMultiContentContext: vi.fn(() => ({ getData: vi.fn() })),
    },
  };
});

vi.mock('../../../mappings_editor', () => {
      const mocked = {
      LoadMappingsFromJsonButton: vi.fn(() => null),
      MappingsEditor: vi.fn(() => null),
    };
      return { ...mocked, default: mocked };
    });

const mockMappingsEditor = vi.mocked(MappingsEditor);
const docLinks = docLinksServiceMock.createStartContract();
const appDependencies = { docLinks } as AppDependencies;
let http = httpServiceMock.createSetupContract();

const renderContainer = () =>
  render(
    <I18nProvider>
      <AppContextProvider value={appDependencies}>
        <StepMappingsContainer esDocsBase="" />
      </AppContextProvider>
    </I18nProvider>
  );

describe('StepMappingsContainer', () => {
  beforeAll(() => {
    documentationService.setup(docLinks);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    http = httpServiceMock.createSetupContract();
    httpService.setup(http);
  });

  it('loads node plugins and passes them through StepMappings to MappingsEditor', async () => {
    http.get.mockResolvedValue(['mapper-size']);

    renderContainer();

    await waitFor(() => {
      expect(mockMappingsEditor).toHaveBeenLastCalledWith(
        expect.objectContaining({ esNodesPlugins: ['mapper-size'] }),
        expect.anything()
      );
    });
    expect(http.get).toHaveBeenCalledWith(`${API_BASE_PATH}/nodes/plugins`, expect.anything());
  });

  it('passes a resolved empty plugin list through StepMappings to MappingsEditor', async () => {
    http.get.mockResolvedValue([]);

    renderContainer();
    const callsWhileLoading = mockMappingsEditor.mock.calls.length;

    await waitFor(() => {
      expect(mockMappingsEditor.mock.calls.length).toBeGreaterThan(callsWhileLoading);
    });
    expect(mockMappingsEditor).toHaveBeenLastCalledWith(
      expect.objectContaining({ esNodesPlugins: [] }),
      expect.anything()
    );
  });

  it('falls back to an empty plugin list while plugins are loading', () => {
    http.get.mockReturnValue(new Promise(() => {}));

    renderContainer();

    expect(mockMappingsEditor.mock.calls[0][0]).toEqual(
      expect.objectContaining({ esNodesPlugins: [] })
    );
  });
});
