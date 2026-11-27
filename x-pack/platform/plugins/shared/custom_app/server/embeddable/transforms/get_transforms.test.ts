/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_APP_STATE_VERSION } from '@kbn/custom-app-common';
import type { CustomAppEmbeddableState } from '../schemas';
import { CUSTOM_APP_SAVED_OBJECT_REF_NAME, getTransforms } from './get_transforms';

const document = { state: {}, root: { type: 'heading' as const, id: 'title', text: 'Hi' } };
const byValue = { version: CUSTOM_APP_STATE_VERSION, document } as CustomAppEmbeddableState;

describe('the custom app transforms', () => {
  const { transformIn, transformOut } = getTransforms();

  describe('writing a panel', () => {
    it('keeps an app of the panel as it is, with nothing referenced', () => {
      expect(transformIn(byValue)).toEqual({ state: byValue, references: [] });
    });

    it('takes the id out of the state of a link and references the saved app instead', () => {
      const { state, references } = transformIn({
        ref_id: 'app-1',
        title: 'Mine',
      } as CustomAppEmbeddableState);

      expect(state).toEqual({ title: 'Mine' });
      expect(state).not.toHaveProperty('ref_id');
      expect(references).toEqual([
        { name: CUSTOM_APP_SAVED_OBJECT_REF_NAME, type: 'custom_app', id: 'app-1' },
      ]);
    });

    it('references it under a name that is the same for every panel, as dashboards expect', () => {
      expect(CUSTOM_APP_SAVED_OBJECT_REF_NAME).toBe('savedObjectRef');
    });
  });

  describe('reading a panel', () => {
    it('puts the id back from the reference', () => {
      const state = transformOut({ title: 'Mine' } as never, [
        { name: CUSTOM_APP_SAVED_OBJECT_REF_NAME, type: 'custom_app', id: 'app-1' },
      ]);

      expect(state).toMatchObject({ ref_id: 'app-1' });
    });

    it('leaves an app of the panel as it is when it has no reference', () => {
      expect(transformOut(byValue as never, [])).not.toHaveProperty('ref_id');
      expect(transformOut(byValue as never)).toMatchObject({ document });
    });

    it('ignores references of another type or name, which belong to something else', () => {
      const state = transformOut(byValue as never, [
        { name: CUSTOM_APP_SAVED_OBJECT_REF_NAME, type: 'lens', id: 'x' },
        { name: 'other', type: 'custom_app', id: 'y' },
      ]);

      expect(state).not.toHaveProperty('ref_id');
    });
  });

  it('gives back what was written, for a link and for an app of the panel', () => {
    const link = { ref_id: 'app-1', title: 'Mine' } as CustomAppEmbeddableState;
    const written = transformIn(link);
    expect(transformOut(written.state as never, written.references)).toMatchObject(link);

    const value = transformIn(byValue);
    expect(transformOut(value.state as never, value.references)).toMatchObject(byValue);
  });
});
