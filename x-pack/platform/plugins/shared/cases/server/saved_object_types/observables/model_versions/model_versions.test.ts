/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import { MAX_STORED_OBSERVABLE_FIELD_LENGTH } from '../../../../common/constants';
import type { ObservablePersistedAttributes } from '../../../common/types/observable';
import { modelVersion1 } from './model_version_1';

const observable: ObservablePersistedAttributes = {
  owner: 'securitySolution',
  type_key: 'observable-type-ipv4',
  value: '10.0.0.8',
  description: null,
  source_attachment_id: null,
  created_at: '2026-11-06T09:30:00.000Z',
  created_by: { username: 'analyst', full_name: null, email: null, profile_uid: 'uid-1' },
  updated_at: null,
  updated_by: null,
};

describe('cases-observables model versions', () => {
  describe('version 1', () => {
    const create = modelVersion1.schemas?.create as ObjectType;
    const forwardCompatibility = modelVersion1.schemas?.forwardCompatibility as ObjectType;

    it('is the model-version baseline (no mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });

    describe('create', () => {
      it('accepts an observable with every attribute', () => {
        expect(() =>
          create.validate({
            ...observable,
            description: 'Auto extracted observable',
            source_attachment_id: 'attachment-1',
            updated_at: '2026-11-07T09:30:00.000Z',
            updated_by: { username: 'lead', full_name: 'Lead', email: 'lead@example.com' },
          })
        ).not.toThrow();
      });

      it('accepts a value and a description at the stored-field limit', () => {
        const atLimit = 'a'.repeat(MAX_STORED_OBSERVABLE_FIELD_LENGTH);

        expect(() =>
          create.validate({ ...observable, value: atLimit, description: atLimit })
        ).not.toThrow();
      });

      it('rejects a value longer than the stored-field limit', () => {
        expect(() =>
          create.validate({
            ...observable,
            value: 'a'.repeat(MAX_STORED_OBSERVABLE_FIELD_LENGTH + 1),
          })
        ).toThrow(/\[value\]/);
      });

      it('rejects a description longer than the stored-field limit', () => {
        expect(() =>
          create.validate({
            ...observable,
            description: 'a'.repeat(MAX_STORED_OBSERVABLE_FIELD_LENGTH + 1),
          })
        ).toThrow(/\[description\]/);
      });

      it('rejects an observable without a type key', () => {
        const { type_key: _typeKey, ...withoutTypeKey } = observable;

        expect(() => create.validate(withoutTypeKey)).toThrow(/\[type_key\]/);
      });

      it('rejects an unknown attribute', () => {
        expect(() => create.validate({ ...observable, metadata: { triage: 'confirmed' } })).toThrow(
          /\[metadata\]/
        );
      });

      it('rejects an unknown user attribute', () => {
        expect(() =>
          create.validate({
            ...observable,
            created_by: { ...observable.created_by, avatar: 'a.png' },
          })
        ).toThrow(/\[created_by\.avatar\]/);
      });
    });

    describe('forwardCompatibility', () => {
      it('drops attributes a later model version adds', () => {
        expect(
          forwardCompatibility.validate({
            ...observable,
            metadata: { triage: 'confirmed' },
            created_by: { ...observable.created_by, avatar: 'a.png' },
          })
        ).toEqual(observable);
      });
    });
  });
});
