/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IntValueNode, StringValueNode } from 'graphql';

import { dateScalar } from './resolvers';

describe('Test ScalarDate Resolver', () => {
  describe('#serialize', () => {
    test('Make sure that an epoch date number is serialized', () => {
      const date = dateScalar.serialize(1514782800000);
      expect(date).toEqual('2018-01-01T05:00:00.000Z');
    });

    test('Make sure that a date string is serialized', () => {
      const date = dateScalar.serialize('2018-01-01T05:00:00.000Z');
      expect(date).toEqual('2018-01-01T05:00:00.000Z');
    });
  });

  describe('#parseValue', () => {
    test('Make sure that an epoch date number passes through parseValue', () => {
      const date = dateScalar.parseValue(1514782800000);
      expect(date).toEqual(1514782800000);
    });

    test('Make sure that a date string passes through parseValue', () => {
      const date = dateScalar.parseValue('2018-01-01T05:00:00.000Z');
      expect(date).toEqual('2018-01-01T05:00:00.000Z');
    });
  });

  describe('#parseLiteral', () => {
    test('Make sure that an epoch date string passes through parseLiteral', () => {
      const valueNode: IntValueNode = {
        kind: 'IntValue',
        value: '1514782800000',
      };
      const date = dateScalar.parseLiteral(valueNode);
      expect(date).toEqual(1514782800000);
    });

    test('Make sure that a date string passes through parseLiteral', () => {
      const valueNode: StringValueNode = {
        kind: 'StringValue',
        value: '2018-01-01T05:00:00.000Z',
      };
      const date = dateScalar.parseLiteral(valueNode);
      expect(date).toEqual('2018-01-01T05:00:00.000Z');
    });
  });
});
