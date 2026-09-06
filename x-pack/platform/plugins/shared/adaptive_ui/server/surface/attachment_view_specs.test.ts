/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adapterGallery } from '@kbn/adaptive-ui-adapters';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE } from '../../common/constants';
import { toViewSpec, viewSpecAdapterTypes } from './attachment_view_specs';

describe('viewSpecAdapterTypes', () => {
  // Both parity assertions below pass trivially against an empty list.
  it('is a non-empty comparison on both sides', () => {
    expect(viewSpecAdapterTypes.length).toBeGreaterThan(0);
    expect(adapterGallery.length).toBeGreaterThan(0);
  });

  // The browser reaches these adapters through each attachment type's `getViewSpec`, so a
  // type present in the gallery but missing here renders in chat and degrades to a stub on
  // Slack — the exact failure the surface projection exists to prevent.
  it('covers every attachment type in adapterGallery', () => {
    const missing = adapterGallery
      .map(({ attachmentType }) => attachmentType)
      .filter((attachmentType) => !viewSpecAdapterTypes.includes(attachmentType));

    expect(missing).toEqual([]);
  });

  it('registers no adapter the gallery does not know about', () => {
    const galleryTypes = adapterGallery.map(({ attachmentType }) => attachmentType);
    const stale = viewSpecAdapterTypes.filter(
      (attachmentType) => !galleryTypes.includes(attachmentType)
    );

    expect(stale).toEqual([]);
  });
});

describe('toViewSpec', () => {
  it('parses an Adaptive UI view attachment, whose data is already a spec', () => {
    const spec = { type: 'view', body: [{ type: 'text', body: 'Hello', format: 'markdown' }] };

    expect(
      toViewSpec({
        type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
        data: spec,
      })
    ).toMatchObject({ type: 'view' });
  });

  it('degrades when an Adaptive UI view attachment does not parse', () => {
    expect(
      toViewSpec({ type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, data: { nonsense: true } })
    ).toBeUndefined();
  });

  it('degrades for an attachment type with no adapter', () => {
    expect(toViewSpec({ type: 'some.unmapped.type', data: {} })).toBeUndefined();
  });

  it('degrades rather than throwing when an adapter rejects its data', () => {
    // A stored attachment predating a shape change must not abort the surrounding reply.
    expect(toViewSpec({ type: 'nightshift.investigation', data: undefined })).toBeUndefined();
  });
});
