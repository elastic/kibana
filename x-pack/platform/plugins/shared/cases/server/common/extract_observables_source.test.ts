/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExtractObservablesSource } from './extract_observables_source';

describe('getExtractObservablesSource', () => {
  it.each([
    // No chosen value: the baseline decides.
    [undefined, undefined, true, 'space_default'],
    [null, undefined, false, 'space_default'],
    [undefined, true, false, 'template'],
    [undefined, false, true, 'template'],
    // A chosen value equal to the baseline keeps the baseline source.
    [true, undefined, true, 'space_default'],
    [false, undefined, false, 'space_default'],
    [true, true, false, 'template'],
    [false, false, true, 'template'],
    // A chosen value that differs from the baseline uses the chosen source.
    [false, undefined, true, 'explicit'],
    [true, undefined, false, 'explicit'],
    [false, true, false, 'explicit'],
    [true, false, true, 'explicit'],
  ] as const)(
    'caller %s, template %s, default %s gives %s',
    (chosenValue, templateValue, defaultValue, expected) => {
      expect(
        getExtractObservablesSource({
          chosenValue,
          chosenSource: 'explicit',
          templateValue,
          defaultValue,
        })
      ).toBe(expected);
    }
  );

  it('uses the "rule" source when a rule value differs from the baseline', () => {
    expect(
      getExtractObservablesSource({
        chosenValue: false,
        chosenSource: 'rule',
        templateValue: true,
        defaultValue: true,
      })
    ).toBe('rule');
  });

  it('keeps the baseline source when a rule value equals the baseline', () => {
    expect(
      getExtractObservablesSource({
        chosenValue: true,
        chosenSource: 'rule',
        templateValue: undefined,
        defaultValue: true,
      })
    ).toBe('space_default');
  });
});
