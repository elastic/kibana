/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pruneContentReferences } from './prune_content_references';
import { securityAlertsPageReference } from '../references';
import { ContentReferencesStore } from '../types';
import { newContentReferencesStore } from './content_references_store';

describe('pruneContentReferences', () => {
  let contentReferencesStore: ContentReferencesStore;
  beforeEach(() => {
    contentReferencesStore = newContentReferencesStore();
  });

  it('prunes content references correctly', async () => {
    const alertsPageReference1 = contentReferencesStore.add((p) =>
      securityAlertsPageReference('abc')
    );
    const alertsPageReference2 = contentReferencesStore.add((p) =>
      securityAlertsPageReference('def')
    );
    contentReferencesStore.add((p) => securityAlertsPageReference(p.id)); // this one should get pruned

    const content = `Example {reference(abc)} example {reference(def)}`;

    const prunedContentReferences = pruneContentReferences(content, contentReferencesStore);

    const keys = Object.keys(prunedContentReferences!);
    expect(keys.sort()).toEqual([alertsPageReference1.id, alertsPageReference2.id].sort());
  });

  it('prunes comma seperated content references correctly', async () => {
    const alertsPageReference1 = contentReferencesStore.add((p) =>
      securityAlertsPageReference('123')
    );
    const alertsPageReference2 = contentReferencesStore.add((p) =>
      securityAlertsPageReference('456')
    );
    contentReferencesStore.add((p) => securityAlertsPageReference(p.id)); // this one should get pruned

    const content = `Example {reference(123,456)}`;

    const prunedContentReferences = pruneContentReferences(content, contentReferencesStore);

    const keys = Object.keys(prunedContentReferences!);
    expect(keys.sort()).toEqual([alertsPageReference1.id, alertsPageReference2.id].sort());
  });

  it('prunes comma and space seperated content references correctly', async () => {
    const alertsPageReference1 = contentReferencesStore.add((p) =>
      securityAlertsPageReference('123')
    );
    const alertsPageReference2 = contentReferencesStore.add((p) =>
      securityAlertsPageReference('456')
    );
    contentReferencesStore.add((p) => securityAlertsPageReference(p.id)); // this one should get pruned

    const content = `Example {reference(123, 456)}`;

    const prunedContentReferences = pruneContentReferences(content, contentReferencesStore);

    const keys = Object.keys(prunedContentReferences!);
    expect(keys.sort()).toEqual([alertsPageReference1.id, alertsPageReference2.id].sort());
  });
});
