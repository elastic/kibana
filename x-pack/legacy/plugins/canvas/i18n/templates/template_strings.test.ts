/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { getTemplateStrings } from './template_strings';
import { asyncTemplateSpecs } from '../../canvas_plugin_src/templates';

import { TagStrings } from '../tags';

jest.mock('axios');
axios.get.mockImplementation(url => Promise.resolve({ data: url }));

describe('TemplateStrings', () => {
  const templateStrings = getTemplateStrings();
  const templateNames: any[] = [];
  const stringKeys = Object.keys(templateStrings);

  beforeAll(async () => {
    templateNames.push(...(await asyncTemplateSpecs()).map(template => template().name));
  });

  test('All template names should exist in the strings definition', () => {
    templateNames.forEach((name: any) => expect(stringKeys).toContain(name));
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

  test('All templates should have tags that are defined', async () => {
    const tagNames = Object.keys(TagStrings);

    (await asyncTemplateSpecs()).forEach(template => {
      template().tags.forEach((tagName: any) => expect(tagNames).toContain(tagName));
    });
  });
});
