/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseTemplateJson } from './parse_template_json';

describe('parseTemplateJson', () => {
  it('parses a bare object', () => {
    expect(parseTemplateJson('{"verdict":"tp"}')).toEqual({ verdict: 'tp' });
  });

  it('parses an object inside a json fence', () => {
    expect(parseTemplateJson('```json\n{"verdict":"tp"}\n```')).toEqual({ verdict: 'tp' });
  });

  it('parses an object when the fence has no language tag', () => {
    expect(parseTemplateJson('```\n{"verdict":"tp"}\n```')).toEqual({ verdict: 'tp' });
  });

  it('parses the object when a fence is never closed', () => {
    expect(parseTemplateJson('```json\n{"verdict":"tp"}')).toEqual({ verdict: 'tp' });
  });

  it('throws when the text has no object', () => {
    expect(() => parseTemplateJson('no json here')).toThrow(
      'Template response did not contain a JSON object'
    );
  });
});
