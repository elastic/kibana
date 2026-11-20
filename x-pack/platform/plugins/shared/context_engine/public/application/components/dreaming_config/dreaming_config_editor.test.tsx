/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import {
  DreamingConfigEditor,
  draftOf,
  typesOfDraft,
  type DreamingConfigDraft,
} from './dreaming_config_editor';

const SUPPORT = draftOf({
  facts: [{ type: 'solution', description: 'A confirmed fix.' }],
  entities: { nodes: [{ type: 'issue', attributes: ['severity'] }, { type: 'product_area' }] },
  relationships: [{ type: 'affects', description: 'An issue affects a product area.' }],
});

let latest: DreamingConfigDraft;

const Editable = ({ initial }: { initial: DreamingConfigDraft }) => {
  const [draft, setDraft] = useState(initial);
  latest = draft;
  return <DreamingConfigEditor draft={draft} onChange={setDraft} />;
};

const renderEditor = (node: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{node}</EuiProvider>
    </I18nProvider>
  );

const fillName = (value: string) =>
  fireEvent.change(screen.getByTestId('contextDreamingTypeModalName'), { target: { value } });

const save = () => fireEvent.click(screen.getByTestId('contextDreamingTypeModalSave'));

describe('DreamingConfigEditor', () => {
  it('keeps entities and relationships on a draft while entities are off, and leaves them out of the config', () => {
    const off = { ...SUPPORT, entitiesEnabled: false };

    expect(typesOfDraft(off)).toEqual({
      facts: SUPPORT.facts,
      entities: null,
      relationships: [],
    });
    expect(off.relationships).toEqual(SUPPORT.relationships);
    expect(typesOfDraft(SUPPORT)).toEqual(
      expect.objectContaining({
        entities: SUPPORT.entities,
        relationships: SUPPORT.relationships,
      })
    );
  });

  it('edits a fact type in a modal, writing the name the way types are named', () => {
    renderEditor(<Editable initial={SUPPORT} />);

    fireEvent.click(screen.getByTestId('contextDreamingConfigFact-solution-edit'));
    fillName('Confirmed Fix');
    save();

    expect(latest.facts).toEqual([{ type: 'confirmed_fix', description: 'A confirmed fix.' }]);
  });

  it('refuses a name another type of the same kind already uses', () => {
    renderEditor(<Editable initial={SUPPORT} />);

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntities-add'));
    fillName('issue');
    save();

    expect(screen.getByTestId('contextDreamingEntityTypeModal')).toHaveTextContent(
      '"issue" is already used.'
    );
    expect(latest.entities.nodes).toHaveLength(2);
  });

  it('renames and deletes entity types', () => {
    renderEditor(<Editable initial={SUPPORT} />);

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntity-issue-edit'));
    fillName('problem');
    save();
    fireEvent.click(screen.getByTestId('contextDreamingConfigEntity-product_area-delete'));

    expect(latest.entities).toEqual({ nodes: [{ type: 'problem', attributes: ['severity'] }] });
  });

  it('adds, renames and deletes relationship types', () => {
    renderEditor(<Editable initial={SUPPORT} />);

    fireEvent.click(screen.getByTestId('contextDreamingConfigRelationships-add'));
    fillName('Fixed By');
    save();
    expect(latest.relationships).toEqual([...SUPPORT.relationships, { type: 'fixed_by' }]);

    fireEvent.click(screen.getByTestId('contextDreamingConfigRelationship-fixed_by-edit'));
    fillName('affects');
    save();
    expect(screen.getByTestId('contextDreamingRelationshipTypeModal')).toHaveTextContent(
      '"affects" is already used.'
    );
    fillName('about');
    save();
    expect(screen.getByTestId('contextDreamingRelationshipTypeModal')).toHaveTextContent(
      '"about" is already used.'
    );
    fillName('solved_by');
    save();
    fireEvent.click(screen.getByTestId('contextDreamingConfigRelationship-affects-delete'));

    expect(latest.relationships).toEqual([{ type: 'solved_by' }]);
  });

  it('shows relationship types only while entities are on', () => {
    renderEditor(<Editable initial={{ ...SUPPORT, entitiesEnabled: false }} />);

    expect(screen.queryByTestId('contextDreamingConfigRelationships')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntitiesSwitch'));

    expect(screen.getByTestId('contextDreamingConfigRelationships')).toBeInTheDocument();
    expect(latest.relationships).toEqual(SUPPORT.relationships);
  });

  it('suggests entities when they are turned on with none', () => {
    renderEditor(
      <DreamingConfigEditor
        draft={draftOf({ facts: SUPPORT.facts })}
        onChange={(next) => {
          latest = next;
        }}
        suggestedEntities={SUPPORT.entities}
      />
    );

    fireEvent.click(screen.getByTestId('contextDreamingConfigEntitiesSwitch'));

    expect(latest).toEqual({ ...SUPPORT, relationships: [], entitiesEnabled: true });
  });

  it('shows a config it cannot change without edit controls', () => {
    renderEditor(<DreamingConfigEditor draft={SUPPORT} />);

    const facts = screen.getByTestId('contextDreamingConfigFacts');
    expect(within(facts).queryByTestId('contextDreamingConfigFacts-add')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextDreamingConfigFact-solution-edit')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextDreamingConfigEntitiesSwitch')).toBeDisabled();
    expect(screen.getByTestId('contextDreamingConfigEntity-issue')).toHaveTextContent('severity');
  });
});
