/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/onechat-common/attachments';
import { parseMentions, hasMentions, stripMentions } from './parse_mentions';

describe('parseMentions', () => {
  it('should parse a single viz mention', () => {
    const result = parseMentions('Check out @viz:abc123');

    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0]).toEqual({
      type: 'viz',
      id: 'abc123',
      fullMatch: '@viz:abc123',
      startIndex: 10,
      endIndex: 21,
    });

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]).toEqual({
      type: AttachmentType.visualizationRef,
      data: {
        saved_object_id: 'abc123',
        saved_object_type: 'lens',
        title: undefined,
      },
    });
  });

  it('should parse a single map mention', () => {
    const result = parseMentions('Look at @map:xyz789');

    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0]).toEqual({
      type: 'map',
      id: 'xyz789',
      fullMatch: '@map:xyz789',
      startIndex: 8,
      endIndex: 19,
    });

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]).toEqual({
      type: AttachmentType.visualizationRef,
      data: {
        saved_object_id: 'xyz789',
        saved_object_type: 'map',
        title: undefined,
      },
    });
  });

  it('should parse multiple mentions', () => {
    const result = parseMentions('Compare @viz:abc with @map:def and @viz:ghi');

    expect(result.mentions).toHaveLength(3);
    expect(result.mentions[0].id).toBe('abc');
    expect(result.mentions[1].id).toBe('def');
    expect(result.mentions[2].id).toBe('ghi');

    expect(result.attachments).toHaveLength(3);
  });

  it('should deduplicate attachments for duplicate IDs', () => {
    const result = parseMentions('@viz:abc123 and again @viz:abc123');

    expect(result.mentions).toHaveLength(2);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].data.saved_object_id).toBe('abc123');
  });

  it('should handle IDs with hyphens and underscores', () => {
    const result = parseMentions('@viz:abc-def_123');

    expect(result.mentions).toHaveLength(1);
    expect(result.mentions[0].id).toBe('abc-def_123');
  });

  it('should not match invalid mention patterns', () => {
    const result = parseMentions('@invalid:abc @:def viz:ghi @viz abc');

    expect(result.mentions).toHaveLength(0);
    expect(result.attachments).toHaveLength(0);
  });

  it('should return original message unchanged', () => {
    const message = 'Hello @viz:abc123 world';
    const result = parseMentions(message);

    expect(result.originalMessage).toBe(message);
  });

  it('should generate display message with titles', () => {
    const result = parseMentions('@viz:abc123 and @map:xyz789', {
      abc123: 'Sales Dashboard',
      xyz789: 'Store Locations',
    });

    expect(result.displayMessage).toBe('Sales Dashboard and Store Locations');
  });

  it('should keep mention intact in display message if no title provided', () => {
    const result = parseMentions('@viz:abc123', {});

    expect(result.displayMessage).toBe('@viz:abc123');
  });

  it('should include title in attachment data when provided', () => {
    const result = parseMentions('@viz:abc123', {
      abc123: 'Sales Dashboard',
    });

    expect(result.attachments[0].data.title).toBe('Sales Dashboard');
  });

  it('should handle empty message', () => {
    const result = parseMentions('');

    expect(result.mentions).toHaveLength(0);
    expect(result.attachments).toHaveLength(0);
    expect(result.originalMessage).toBe('');
    expect(result.displayMessage).toBe('');
  });

  it('should handle message with no mentions', () => {
    const result = parseMentions('Hello world');

    expect(result.mentions).toHaveLength(0);
    expect(result.attachments).toHaveLength(0);
    expect(result.originalMessage).toBe('Hello world');
    expect(result.displayMessage).toBe('Hello world');
  });
});

describe('hasMentions', () => {
  it('should return true for message with mentions', () => {
    expect(hasMentions('@viz:abc')).toBe(true);
    expect(hasMentions('@map:def')).toBe(true);
    expect(hasMentions('text @viz:abc more text')).toBe(true);
  });

  it('should return false for message without mentions', () => {
    expect(hasMentions('no mentions here')).toBe(false);
    expect(hasMentions('@invalid:abc')).toBe(false);
    expect(hasMentions('')).toBe(false);
  });
});

describe('stripMentions', () => {
  it('should remove all mentions from message', () => {
    expect(stripMentions('@viz:abc hello @map:def world')).toBe('hello world');
  });

  it('should collapse extra whitespace', () => {
    expect(stripMentions('@viz:abc   hello   @map:def')).toBe('hello');
  });

  it('should return original message if no mentions', () => {
    expect(stripMentions('hello world')).toBe('hello world');
  });

  it('should return empty string if only mentions', () => {
    expect(stripMentions('@viz:abc @map:def')).toBe('');
  });
});
