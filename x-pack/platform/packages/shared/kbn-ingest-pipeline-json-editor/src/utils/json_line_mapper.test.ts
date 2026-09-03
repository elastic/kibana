/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGeneratedProcessorStepId,
  isGeneratedProcessorStepId,
  mapStepsToJsonLines,
} from './json_line_mapper';

describe('mapStepsToJsonLines', () => {
  it('maps top-level processors by tag', () => {
    const json = `[
  {
    "set": {
      "tag": "set-message",
      "field": "message",
      "value": "hello"
    }
  },
  {
    "grok": {
      "tag": "parse-message",
      "field": "message",
      "patterns": ["%{GREEDYDATA:message}"]
    }
  }
]`;

    const lineMap = mapStepsToJsonLines(json);

    expect(lineMap['set-message']).toEqual({ lineStart: 2, lineEnd: 8 });
    expect(lineMap['parse-message']).toEqual({ lineStart: 9, lineEnd: 15 });
  });

  it('does not map untagged processors while they are being edited', () => {
    const json = `[
  {
    "drop": {}
  }
]`;

    const lineMap = mapStepsToJsonLines(json);

    expect(lineMap).toEqual({});
  });

  it('can map empty processors for focus actions', () => {
    const json = `[
  {
    "set": {}
  }
]`;

    const lineMap = mapStepsToJsonLines(json, { includeEmptyProcessors: true });

    expect(lineMap[getGeneratedProcessorStepId(0)]).toEqual({ lineStart: 2, lineEnd: 4 });
  });

  it('maps valid untagged processors by generated hierarchical id', () => {
    const json = `[
  {
    "set": {
      "field": "attributes.new_thing",
      "override": true,
      "value": "bot",
      "if": "return true",
      "ignore_failure": false
    }
  }
]`;

    const lineMap = mapStepsToJsonLines(json);

    expect(lineMap[getGeneratedProcessorStepId(0)]).toEqual({ lineStart: 2, lineEnd: 10 });
  });

  it('identifies current and legacy generated step ids', () => {
    expect(isGeneratedProcessorStepId('__streams_ui.root.steps[0]')).toBe(true);
    expect(isGeneratedProcessorStepId('root.steps[0]')).toBe(true);
    expect(isGeneratedProcessorStepId('processor-0')).toBe(true);
    expect(isGeneratedProcessorStepId('user-tag')).toBe(false);
  });

  it('normalizes generated-looking tags to generated hierarchical ids', () => {
    const json = `[
  {
    "set": {
      "tag": "root.steps[0]",
      "field": "message",
      "value": "hello"
    }
  }
]`;

    const lineMap = mapStepsToJsonLines(json);

    expect(lineMap[getGeneratedProcessorStepId(0)]).toEqual({ lineStart: 2, lineEnd: 8 });
    expect(lineMap['root.steps[0]']).toBeUndefined();
  });

  it('returns empty map for invalid JSON', () => {
    const lineMap = mapStepsToJsonLines('not: valid: json: [[[');
    expect(Object.keys(lineMap)).toHaveLength(0);
  });
});
