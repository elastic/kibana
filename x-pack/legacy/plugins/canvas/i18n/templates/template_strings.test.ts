/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTemplateStrings } from './template_strings';
import { templateSpecs } from '../../canvas_plugin_src/templates';

import { TagStrings } from '../tags';

describe('TemplateStrings', () => {
  const templateStrings = getTemplateStrings();
  const templateNames = templateSpecs.map(template => template().name);
  const stringKeys = Object.keys(templateStrings);

  test('All template names should exist in the strings definition', () => {
    templateNames.forEach((name: string) => expect(stringKeys).toContain(name));
  });

  test('All string definitions should correspond to an existing template', () => {
    stringKeys.forEach(key => expect(templateNames).toContain(key));
  });

  const strings = Object.values(templateStrings);

  test('All templates should have a name string defined', () => {
    strings.forEach(value => {
      expect(value).toHaveProperty('name');
    });
  });

  test('All templates should have a help string defined', () => {
    strings.forEach(value => {
      expect(value).toHaveProperty('help');
    });
  });

  test('All templates should have tags that are defined', () => {
    const tagNames = Object.keys(TagStrings);

    templateSpecs.forEach(template => {
      template().tags.forEach((tagName: string) => expect(tagNames).toContain(tagName));
    });
  });
});
