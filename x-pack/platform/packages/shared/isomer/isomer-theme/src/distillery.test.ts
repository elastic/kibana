/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { borealisDark, borealisLight } from './borealis_tokens.generated';
import { isomerDistillery } from './distillery';

const { themeVars } = isomerDistillery.environment;

describe('isomerDistillery', () => {
  it('declares each color mode of the EUI Borealis theme', () => {
    expect(themeVars['color/text/paragraph']).toEqual(
      expect.objectContaining({
        light: borealisLight.color.text.paragraph,
        dark: borealisDark.color.text.paragraph,
      })
    );
    expect(themeVars['color/background/filled/danger']).toEqual(
      expect.objectContaining({
        light: borealisLight.color.background.filled.danger,
        dark: borealisDark.color.background.filled.danger,
      })
    );
  });

  it('declares every token as an isomer-prefixed custom property', () => {
    expect(Object.values(themeVars).map(({ cssVar }) => cssVar)).toEqual(
      expect.arrayContaining(['--isomer-color-text-paragraph', '--isomer-font-weight-bold'])
    );
  });
});
