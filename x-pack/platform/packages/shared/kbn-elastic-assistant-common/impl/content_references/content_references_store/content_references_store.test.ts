/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { newContentReferencesStore } from './content_references_store';
import { securityAlertsPageReference } from '../references';
import { ContentReferencesStore } from '../types';

describe('newContentReferencesStore', () => {
  let contentReferencesStore: ContentReferencesStore;
  beforeEach(() => {
    contentReferencesStore = newContentReferencesStore();
  });

  it('adds multiple content reference', async () => {
    const alertsPageReference1 = contentReferencesStore.add((p) =>
      securityAlertsPageReference(p.id)
    );
    const alertsPageReference2 = contentReferencesStore.add((p) =>
      securityAlertsPageReference(p.id)
    );
    const alertsPageReference3 = contentReferencesStore.add((p) =>
      securityAlertsPageReference(p.id)
    );

    const store = contentReferencesStore.getStore();

    const keys = Object.keys(store);

    expect(keys.length).toEqual(3);
    expect(store[alertsPageReference1.id]).toEqual(alertsPageReference1);
    expect(store[alertsPageReference2.id]).toEqual(alertsPageReference2);
    expect(store[alertsPageReference3.id]).toEqual(alertsPageReference3);
  });

  it('referenceIds are unique', async () => {
    const numberOfReferencesToCreate = 50;

    const referenceIds = new Set(
      [...new Array(numberOfReferencesToCreate)]
        .map(() => contentReferencesStore.add((p) => securityAlertsPageReference(p.id)))
        .map((alertsPageReference) => alertsPageReference.id)
    );

    const store = contentReferencesStore.getStore();
    const keys = Object.keys(store);

    expect(referenceIds.size).toEqual(numberOfReferencesToCreate);
    expect(keys.length).toEqual(numberOfReferencesToCreate);
  });
});
