/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { LoadedDreamingTemplate } from '../../../../common/dreaming_templates';
import { draftOf } from '../dreaming_config/dreaming_config_editor';
import { useDreamingTemplates } from '../../hooks/use_dreaming_templates';
import { CUSTOM_TEMPLATE_ID, useDreamingSetupDraft } from './use_dreaming_setup_draft';

jest.mock('../../hooks/use_dreaming_templates', () => ({ useDreamingTemplates: jest.fn() }));

const SUPPORT: LoadedDreamingTemplate = {
  id: 'customer_support',
  name: 'Customer support',
  description: 'Tickets and docs.',
  summary: 'Customer support knowledge base.',
  rationale: 'Support knowledge centers on issues.',
  dreaming: {
    instructions: 'Record confirmed fixes.',
    facts: [{ type: 'solution', description: 'A confirmed fix.' }],
    entities: {
      nodes: [{ type: 'issue', description: 'A known problem.', attributes: ['severity'] }],
    },
  },
};

const LEGAL: LoadedDreamingTemplate = {
  id: 'legal_assistant',
  name: 'Legal assistant',
  description: 'Contracts.',
  summary: 'Legal knowledge.',
  rationale: 'Rules and the documents that apply them.',
  dreaming: {
    instructions: 'Record obligations.',
    facts: [{ type: 'obligation' }],
    entities: { nodes: [{ type: 'contract' }] },
  },
};

describe('useDreamingSetupDraft', () => {
  beforeEach(() => {
    jest.mocked(useDreamingTemplates).mockReturnValue({
      templates: [SUPPORT, LEGAL],
      isLoading: false,
      error: undefined,
    });
  });

  it('starts from the first template', () => {
    const { result } = renderHook(() => useDreamingSetupDraft());

    expect(result.current.selectedId).toBe('customer_support');
    expect(result.current.isCustom).toBe(false);
    expect(result.current.summary).toBe('Customer support knowledge base.');
    expect(result.current.draft).toEqual(draftOf(SUPPORT.dreaming, { entitiesEnabled: false }));
    expect(result.current.canApply).toBe(true);
  });

  it('switches templates and resets an edited summary', () => {
    const { result } = renderHook(() => useDreamingSetupDraft());

    act(() => {
      result.current.setSummary('Acme support.');
    });
    expect(result.current.summary).toBe('Acme support.');

    act(() => {
      result.current.select('legal_assistant');
    });

    expect(result.current.selectedId).toBe('legal_assistant');
    expect(result.current.summary).toBe('Legal knowledge.');
    expect(result.current.draft).toEqual(draftOf(LEGAL.dreaming, { entitiesEnabled: false }));
  });

  it('uses an empty draft and summary for Custom', () => {
    const { result } = renderHook(() => useDreamingSetupDraft());

    act(() => {
      result.current.select(CUSTOM_TEMPLATE_ID);
    });

    expect(result.current.isCustom).toBe(true);
    expect(result.current.summary).toBe('');
    expect(result.current.draft).toEqual(draftOf({}));
    expect(result.current.canApply).toBe(false);
  });

  it('builds a save config from the draft and summary', () => {
    const { result } = renderHook(() => useDreamingSetupDraft());

    act(() => {
      result.current.setSummary('Acme customer support knowledge base.');
    });

    expect(result.current.buildConfig()).toEqual({
      instructions: 'Acme customer support knowledge base.\n\nRecord confirmed fixes.',
      facts: SUPPORT.dreaming.facts,
      entities: null,
      relationships: [],
    });
  });
});
