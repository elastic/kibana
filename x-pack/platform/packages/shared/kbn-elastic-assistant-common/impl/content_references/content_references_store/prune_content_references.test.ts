/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pruneContentReferences } from './prune_content_references';
import { securityAlertsPageReference } from '../references';
import { contentReferenceBlock } from '../references/utils';
import { ContentReferencesStore } from '../types';
import { newContentReferencesStore } from './content_references_store';

describe('pruneContentReferences', () => {
  let contentReferencesStore: ContentReferencesStore;
  beforeEach(() => {
    contentReferencesStore = newContentReferencesStore();
  });

  it('prunes content references correctly', async () => {
    const alertsPageReference1 = contentReferencesStore.add((p) =>
      securityAlertsPageReference(p.id)
    );
    const alertsPageReference2 = contentReferencesStore.add((p) =>
      securityAlertsPageReference(p.id)
    );
    contentReferencesStore.add((p) => securityAlertsPageReference(p.id)); // this one should get pruned

    const content = `Example ${contentReferenceBlock(
      alertsPageReference1
    )} example ${contentReferenceBlock(alertsPageReference2)}`;

    const prunedContentReferences = pruneContentReferences(content, contentReferencesStore);

    const keys = Object.keys(prunedContentReferences!);
    expect(keys.sort()).toEqual([alertsPageReference1.id, alertsPageReference2.id].sort());
  });
});
