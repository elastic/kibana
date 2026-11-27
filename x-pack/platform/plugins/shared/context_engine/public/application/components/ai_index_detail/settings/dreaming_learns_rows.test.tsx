/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { draftOf, type DreamingConfigDraft } from '../../dreaming_config/dreaming_config_editor';
import { DreamingLearnsRows } from './dreaming_learns_rows';

const SUPPORT = draftOf({
  facts: [{ type: 'solution', description: 'A confirmed fix.' }],
  entities: { nodes: [{ type: 'issue', attributes: ['severity'] }, { type: 'product_area' }] },
  relationships: [{ type: 'affects', description: 'An issue affects a product area.' }],
});

let latest: DreamingConfigDraft;

const onChange = jest.fn();

const Editable = ({ initial }: { initial: DreamingConfigDraft }) => {
  const [draft, setDraft] = useState(initial);
  const handleChange = (next: DreamingConfigDraft) => {
    latest = next;
    onChange(next);
    setDraft(next);
  };
  return <DreamingLearnsRows draft={draft} onChange={handleChange} />;
};

const renderRows = (node: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{node}</EuiProvider>
    </I18nProvider>
  );

describe('DreamingLearnsRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders row headings and the fact types section', () => {
    renderRows(<Editable initial={SUPPORT} />);

    expect(screen.getByRole('heading', { name: 'What dreaming learns' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Also learn entities' })).toBeInTheDocument();
    expect(screen.getByTestId('contextDreamingConfigFacts')).toBeInTheDocument();
  });

  it('hides entity and relationship sections when entities are off', () => {
    renderRows(<Editable initial={draftOf(SUPPORT, { entitiesEnabled: false })} />);

    const entitiesSwitch = screen.getByTestId('contextDreamingConfigEntitiesSwitch');
    expect(entitiesSwitch).not.toBeChecked();
    expect(screen.queryByTestId('contextDreamingConfigEntities')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextDreamingConfigRelationships')).not.toBeInTheDocument();
  });

  it('shows entity and relationship sections when entities are on', () => {
    renderRows(<Editable initial={SUPPORT} />);

    expect(screen.getByTestId('contextDreamingConfigEntitiesSwitch')).toBeChecked();
    expect(screen.getByTestId('contextDreamingConfigEntities')).toBeInTheDocument();
    expect(screen.getByTestId('contextDreamingConfigRelationships')).toBeInTheDocument();
  });

  it('toggles entitiesEnabled through onChange', () => {
    renderRows(<Editable initial={SUPPORT} />);

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntitiesSwitch'));

    expect(onChange).toHaveBeenCalled();
    expect(latest.entitiesEnabled).toBe(false);
  });

  it('shows a skeleton without the config editor while draft is loading', () => {
    renderRows(<DreamingLearnsRows draft={undefined} onChange={onChange} />);

    expect(screen.getByRole('heading', { name: 'What dreaming learns' })).toBeInTheDocument();
    expect(screen.queryByTestId('contextDreamingConfigEditor')).not.toBeInTheDocument();
  });
});
