/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { capturePaths, createCaptureWriter, toPathSegment, toStableJson } from './capture_writer';

describe('toPathSegment', () => {
  it('keeps IDs that are already safe', () => {
    expect(toPathSegment('7adfa750-4c81-11e8-b3d7-01146121b73d')).toBe(
      '7adfa750-4c81-11e8-b3d7-01146121b73d'
    );
  });

  it('lowercases and replaces anything else', () => {
    expect(toPathSegment('../Panel 1/Ünïcode')).toBe('panel-1-n-code');
  });

  it('throws when nothing usable is left', () => {
    expect(() => toPathSegment('../')).toThrow('Cannot build a path segment');
  });
});

describe('toStableJson', () => {
  it('sorts object keys at every depth and keeps array order', () => {
    expect(toStableJson({ b: { d: 1, c: 2 }, a: [{ z: 1, y: 2 }, 3] })).toBe(
      toStableJson({ a: [{ y: 2, z: 1 }, 3], b: { c: 2, d: 1 } })
    );
    expect(JSON.parse(toStableJson({ b: 1, a: 2 }))).toEqual({ a: 2, b: 1 });
    expect(Object.keys(JSON.parse(toStableJson({ b: 1, a: 2 })))).toEqual(['a', 'b']);
  });
});

describe('capturePaths', () => {
  it('lays out panel captures per dashboard, panel and theme', () => {
    expect(capturePaths.panelCapture('sample-flights', 'abc', 'dark')).toBe(
      Path.join('sample-flights', 'panels', 'abc', 'dark', 'capture.json')
    );
    expect(capturePaths.panelScreenshot('sample-flights', 'abc', 'light')).toBe(
      Path.join('sample-flights', 'panels', 'abc', 'light', 'screenshot.png')
    );
  });
});

describe('createCaptureWriter', () => {
  let root: string;

  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'isomer-corpus-'));
  });

  afterEach(() => {
    Fs.rmSync(root, { recursive: true, force: true });
  });

  it('writes stable JSON, creating directories', () => {
    const writer = createCaptureWriter(root);
    writer.writeJson('a/b/c.json', { b: 1, a: [1, 2] });
    expect(Fs.readFileSync(Path.join(root, 'a/b/c.json'), 'utf8')).toBe(
      '{\n  "a": [\n    1,\n    2\n  ],\n  "b": 1\n}\n'
    );
  });

  it('refuses to write outside the root', () => {
    const writer = createCaptureWriter(root);
    expect(() => writer.writeJson('../escape.json', {})).toThrow('outside the capture root');
  });
});
