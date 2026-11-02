/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { buildAttachmentTypeFilter } from './type_filter';

describe('buildAttachmentTypeFilter', () => {
  it('returns undefined when types is undefined or empty', () => {
    expect(buildAttachmentTypeFilter(undefined)).toBeUndefined();
    expect(buildAttachmentTypeFilter([])).toBeUndefined();
  });

  it('maps a unified alert type to leftover `alert` rows of the matching owner prefix', () => {
    const filter = JSON.stringify(buildAttachmentTypeFilter(['security.alert']));

    expect(filter).toContain('cases-comments.attributes.type');
    expect(filter).toContain('"alert"');
    expect(filter).toContain('cases-comments.attributes.owner');
    expect(filter).toContain(`"${SECURITY_SOLUTION_OWNER}"`);
    expect(filter).toContain('cases-attachments.attributes.type');
    expect(filter).toContain('"security.alert"');
  });

  it('does not match leftover alerts of a different owner prefix', () => {
    const security = JSON.stringify(buildAttachmentTypeFilter(['security.alert']));
    const observability = JSON.stringify(buildAttachmentTypeFilter(['observability.alert']));

    expect(security).toContain(`"${SECURITY_SOLUTION_OWNER}"`);
    expect(security).not.toContain(`"${OBSERVABILITY_OWNER}"`);
    expect(observability).toContain(`"${OBSERVABILITY_OWNER}"`);
    expect(observability).not.toContain(`"${SECURITY_SOLUTION_OWNER}"`);
  });

  it('does not recognize legacy spellings (e.g. `alert`) as a unified type', () => {
    const filter = JSON.stringify(buildAttachmentTypeFilter(['alert']));

    // Only added as a literal (never-matching) unified-side value; no leftover mapping applies.
    expect(filter).not.toContain('cases-comments.attributes.type');
  });

  it('matches leftover `actions` rows and the endpoint external-reference subtype', () => {
    const filter = JSON.stringify(buildAttachmentTypeFilter(['security.endpoint']));

    expect(filter).toContain('"actions"');
    expect(filter).toContain('externalReferenceAttachmentTypeId');
    expect(filter).toContain('"endpoint"');
    expect(filter).toContain('cases-attachments.attributes.type');
    expect(filter).toContain('"security.endpoint"');
  });

  it('matches a specific external-reference subtype id, not the whole leftover bucket', () => {
    const osquery = JSON.stringify(buildAttachmentTypeFilter(['osquery']));
    const file = JSON.stringify(buildAttachmentTypeFilter(['file']));

    expect(osquery).toContain('externalReferenceAttachmentTypeId');
    expect(osquery).toContain('"osquery"');
    expect(osquery).not.toEqual(file);
  });

  it('matches a specific persistable-state subtype id (e.g. `lens`)', () => {
    const filter = JSON.stringify(buildAttachmentTypeFilter(['lens']));

    expect(filter).toContain('persistableStateAttachmentTypeId');
    expect(filter).toContain('".lens"');
  });

  it('treats unified-only types (no leftover form) as unified-side only', () => {
    const filter = JSON.stringify(buildAttachmentTypeFilter(['security.entity']));

    expect(filter).toContain('cases-attachments.attributes.type');
    expect(filter).not.toContain('cases-comments.attributes.type');
  });

  it('combines multiple requested types', () => {
    const filter = buildAttachmentTypeFilter(['comment', 'security.entity']);

    expect(filter).toBeDefined();
    const asString = JSON.stringify(filter);
    expect(asString).toContain('"comment"');
    expect(asString).toContain('"security.entity"');
  });
});
