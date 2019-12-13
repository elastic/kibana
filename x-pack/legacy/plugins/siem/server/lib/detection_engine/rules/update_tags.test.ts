/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateTags } from './update_tags';
import { INTERNAL_IDENTIFIER } from '../../../../common/constants';

describe('update_tags', () => {
  test('it should copy internal structures but not any other tags when updating', () => {
    const tags = updateTags(['tag 2', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 3'], ['tag 1']);
    expect(tags).toEqual([`${INTERNAL_IDENTIFIER}_some_value`, 'tag 1']);
  });

  test('it should copy internal structures but not any other tags if given an update of empty tags', () => {
    const tags = updateTags(['tag 2', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 3'], []);
    expect(tags).toEqual([`${INTERNAL_IDENTIFIER}_some_value`]);
  });

  test('it should work like a normal update if there are no internal structures', () => {
    const tags = updateTags(['tag 2', 'tag 3'], ['tag 1']);
    expect(tags).toEqual(['tag 1']);
  });

  test('it should not perform an update if the nextTags are undefined', () => {
    const tags = updateTags(['tag 2', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 3'], undefined);
    expect(tags).toEqual(['tag 2', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 3']);
  });

  test('it should not perform an update if the nextTags are null', () => {
    const tags = updateTags(['tag 2', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 3'], null);
    expect(tags).toEqual(['tag 2', `${INTERNAL_IDENTIFIER}_some_value`, 'tag 3']);
  });
});
