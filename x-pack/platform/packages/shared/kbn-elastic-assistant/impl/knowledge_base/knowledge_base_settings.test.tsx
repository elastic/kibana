/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render } from '@testing-library/react';

import { DEFAULT_LATEST_ALERTS } from '../assistant_context/constants';
import { KnowledgeBaseSettings } from './knowledge_base_settings';
import { TestProviders } from '../mock/test_providers/test_providers';
import { useKnowledgeBaseStatus } from '../assistant/api/knowledge_base/use_knowledge_base_status';
import { mockSystemPrompts } from '../mock/system_prompt';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { of } from 'rxjs';

const mockUseAssistantContext = {
  allSystemPrompts: mockSystemPrompts,
  assistantFeatures: vi.fn(() => defaultAssistantFeatures),
  conversations: {},
  http: {
    basePath: {
      prepend: vi.fn(),
    },
  },
  setAllSystemPrompts: vi.fn(),
  setConversations: vi.fn(),
  assistantAvailability: {
    isAssistantEnabled: true,
    hasAssistantPrivilege: true,
  },
  chrome: {
    getChromeStyle$: vi.fn(() => of('classic')),
  },
};

vi.mock('../assistant_context', async () => {
  const original = (await vi.importActual('../assistant_context'));
  return {
    ...original,

    useAssistantContext: vi.fn().mockImplementation(() => mockUseAssistantContext),
  };
});

const setUpdatedKnowledgeBaseSettings = vi.fn();
const defaultProps = {
  knowledgeBase: {
    latestAlerts: DEFAULT_LATEST_ALERTS,
  },
  setUpdatedKnowledgeBaseSettings,
};

const mockSetup = vi.fn();
vi.mock('../assistant/api/knowledge_base/use_setup_knowledge_base', () => {
      const mocked = {
      useSetupKnowledgeBase: vi.fn(() => {
        return {
          mutate: mockSetup,
          isLoading: false,
        };
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../assistant/api/knowledge_base/use_knowledge_base_status', () => {
      const mocked = {
      useKnowledgeBaseStatus: vi.fn(() => {
        return {
          data: {
            elser_exists: true,
          },
          isLoading: false,
          isFetching: false,
        };
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('Knowledge base settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('On enable knowledge base, call setup knowledge base setup', () => {
    (useKnowledgeBaseStatus as Mock).mockImplementation(() => {
      return {
        data: {
          elser_exists: true,
          is_setup_available: true,
        },
        isLoading: false,
        isFetching: false,
      };
    });
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('kb-installed')).not.toBeInTheDocument();
    expect(getByTestId('install-kb')).toBeInTheDocument();
    fireEvent.click(getByTestId('setupKnowledgeBaseButton'));
    expect(mockSetup).toHaveBeenCalled();
  });
  it('If elser does not exist, do not offer knowledge base', () => {
    (useKnowledgeBaseStatus as Mock).mockImplementation(() => {
      return {
        data: {
          elser_exists: false,
        },
        isLoading: false,
        isFetching: false,
      };
    });
    const { queryByTestId } = render(
      <TestProviders>
        <KnowledgeBaseSettings {...defaultProps} />
      </TestProviders>
    );
    expect(queryByTestId('knowledgeBaseActionButton')).not.toBeInTheDocument();
  });
});
