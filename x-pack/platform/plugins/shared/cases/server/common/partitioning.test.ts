/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../common/constants';
import { CASE_REF_NAME } from './constants';
import { partitionByCaseAssociation } from './partitioning';
import type { AttachmentSavedObject } from './types';

describe('partitioning', () => {
  describe('partitionByCaseAssociation', () => {
    it('returns empty arrays when given an empty array', () => {
      expect(partitionByCaseAssociation('', [])).toEqual([[], []]);
    });

    it('returns attachments in the second array when attachment has an empty references array', () => {
      expect(
        partitionByCaseAssociation('123', [
          {
            references: [],
          } as unknown as AttachmentSavedObject,
        ])
      ).toMatchInlineSnapshot(`
        Array [
          Array [],
          Array [
            Object {
              "references": Array [],
            },
          ],
        ]
      `);
    });

    it('returns attachments in the second array when the case id reference does not match the id passed in', () => {
      expect(
        partitionByCaseAssociation('123', [
          {
            references: [{ name: CASE_REF_NAME, type: CASE_SAVED_OBJECT, id: 'abc' }],
          } as unknown as AttachmentSavedObject,
        ])
      ).toMatchInlineSnapshot(`
        Array [
          Array [],
          Array [
            Object {
              "references": Array [
                Object {
                  "id": "abc",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
            },
          ],
        ]
      `);
    });

    it('returns attachments in the second array when the attachment does not have a valid case reference', () => {
      expect(
        partitionByCaseAssociation('123', [
          {
            references: [{ name: 'abc', type: CASE_SAVED_OBJECT, id: '123' }],
          } as unknown as AttachmentSavedObject,
        ])
      ).toMatchInlineSnapshot(`
        Array [
          Array [],
          Array [
            Object {
              "references": Array [
                Object {
                  "id": "123",
                  "name": "abc",
                  "type": "cases",
                },
              ],
            },
          ],
        ]
      `);
    });

    it('returns attachments in the first array when the case id reference matches the id passed in', () => {
      expect(
        partitionByCaseAssociation('123', [
          {
            references: [{ name: CASE_REF_NAME, type: CASE_SAVED_OBJECT, id: '123' }],
          } as unknown as AttachmentSavedObject,
        ])
      ).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "references": Array [
                Object {
                  "id": "123",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
            },
          ],
          Array [],
        ]
      `);
    });
  });
});
