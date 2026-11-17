/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { DreamingEnrichmentConfig, DreamingWikiConfig } from '../../../../common/dreaming';
import { draftOf } from './dreaming_config_editor';
import {
  EnrichmentEditor,
  WikiEditor,
  isEnrichmentValid,
  isWikiValid,
  kiTypeSuggestions,
  normalizedEnrichment,
  normalizedWiki,
} from './enrichment_and_wiki_editor';

const withProviders = (node: React.ReactNode) =>
  render(
    <I18nProvider>
      <EuiProvider>{node}</EuiProvider>
    </I18nProvider>
  );

describe('kiTypeSuggestions', () => {
  it('suggests every fact and entity, and each configured type', () => {
    expect(
      kiTypeSuggestions(
        draftOf({ facts: [{ type: 'preference' }], entities: { nodes: [{ type: 'customer' }] } })
      )
    ).toEqual(['fact.*', 'entity.*', 'fact.preference', 'entity.customer']);
  });
});

describe('validation', () => {
  it('checks the counts and the refresh interval', () => {
    expect(isEnrichmentValid(undefined)).toBe(true);
    expect(isEnrichmentValid({ enabled: true, max_documents: 10, refresh_after: '7d' })).toBe(true);
    expect(isEnrichmentValid({ enabled: true, max_documents: 0 })).toBe(false);
    expect(isEnrichmentValid({ enabled: true, max_documents: 1.5 })).toBe(false);
    expect(isEnrichmentValid({ enabled: true, refresh_after: 'soon' })).toBe(false);
    expect(isWikiValid({ enabled: true, max_pages: 25 })).toBe(true);
    expect(isWikiValid({ enabled: true, max_pages: 26 })).toBe(false);
  });
});

describe('normalized configs', () => {
  it('trims prompts and leaves out empty fields', () => {
    expect(
      normalizedEnrichment({
        enabled: true,
        selection: '  ',
        improvement: ' Tiers. ',
        ki_types: [],
        refresh_after: ' 7d ',
      })
    ).toEqual({ enabled: true, improvement: 'Tiers.', refresh_after: '7d' });
    expect(
      normalizedWiki({ enabled: false, instructions: '', research: true, ki_types: ['x'] })
    ).toEqual({
      enabled: false,
      ki_types: ['x'],
    });
  });
});

describe('EnrichmentEditor', () => {
  const renderEditor = (enrichment?: DreamingEnrichmentConfig, hasSources = true) => {
    const onChange = jest.fn();
    withProviders(
      <EnrichmentEditor
        enrichment={enrichment}
        onChange={onChange}
        kiTypeSuggestions={['fact.*', 'entity.*']}
        hasSources={hasSources}
      />
    );
    return onChange;
  };

  it('shows only the switch while enrichment is off', () => {
    const onChange = renderEditor();

    expect(
      screen.queryByTestId('contextDreamingConfigEnrichmentSelection')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('contextDreamingConfigEnrichmentEnabled'));

    expect(onChange).toHaveBeenCalledWith({ enabled: true });
  });

  it('edits the prompts and limits of an enrichment that is on', () => {
    const onChange = renderEditor({ enabled: true, selection: 'Thin items.' });

    expect(screen.getByTestId('contextDreamingConfigEnrichmentSelection')).toHaveValue(
      'Thin items.'
    );
    fireEvent.change(screen.getByTestId('contextDreamingConfigEnrichmentImprovement'), {
      target: { value: 'Tiers.' },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      enabled: true,
      selection: 'Thin items.',
      improvement: 'Tiers.',
    });
    fireEvent.change(screen.getByTestId('contextDreamingConfigEnrichmentMaxDocuments'), {
      target: { value: '7' },
    });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ max_documents: 7 }));
  });

  it('warns when there is no source to search', () => {
    renderEditor({ enabled: true }, false);

    expect(screen.getByTestId('contextDreamingConfigEnrichmentNoSources')).toBeInTheDocument();
  });
});

describe('WikiEditor', () => {
  const renderEditor = (wiki?: DreamingWikiConfig) => {
    const onChange = jest.fn();
    withProviders(<WikiEditor wiki={wiki} onChange={onChange} kiTypeSuggestions={['fact.*']} />);
    return onChange;
  };

  it('turns wiki pages on', () => {
    const onChange = renderEditor();

    fireEvent.click(screen.getByTestId('contextDreamingConfigWikiEnabled'));

    expect(onChange).toHaveBeenCalledWith({ enabled: true });
  });

  it('researches the sources by default, and can be told not to', () => {
    const onChange = renderEditor({ enabled: true });

    expect(screen.getByTestId('contextDreamingConfigWikiResearch')).toBeChecked();
    fireEvent.click(screen.getByTestId('contextDreamingConfigWikiResearch'));

    expect(onChange).toHaveBeenCalledWith({ enabled: true, research: false });
  });

  it('flags a page count over the cap', () => {
    renderEditor({ enabled: true, max_pages: 30 });

    expect(screen.getByTestId('contextDreamingConfigWikiMaxPages')).toBeInvalid();
  });
});
