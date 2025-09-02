/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateXmlTag } from './xml';

describe('generateXmlTag', () => {
  test('should create a simple self-closing tag when no attributes or content are provided', () => {
    expect(generateXmlTag('br')).toBe('<br />');
  });

  test('should create a simple tag with content', () => {
    expect(generateXmlTag('p', {}, 'Hello World')).toBe('<p>Hello World</p>');
  });

  test('should create a self-closing tag with a single attribute', () => {
    const attributes = { src: 'image.jpg' };
    expect(generateXmlTag('img', attributes)).toBe('<img src="image.jpg" />');
  });

  test('should create a self-closing tag with multiple attributes', () => {
    const attributes = {
      path: 'user.name',
      type: 'keyword',
      indexed: true,
    };
    expect(generateXmlTag('field', attributes)).toBe(
      '<field path="user.name" type="keyword" indexed="true" />'
    );
  });

  test('should create a tag with both attributes and content', () => {
    const attributes = { class: 'greeting' };
    const content = 'Hello Again';
    expect(generateXmlTag('div', attributes, content)).toBe(
      '<div class="greeting">Hello Again</div>'
    );
  });

  test('should ignore attributes with null or undefined values', () => {
    const attributes = {
      id: 'main',
      'data-value': null,
      'aria-label': undefined,
      role: 'main',
    };
    expect(generateXmlTag('section', attributes)).toBe('<section id="main" role="main" />');
  });

  test('should handle number and boolean attribute values correctly', () => {
    const attributes = {
      count: 10,
      enabled: false,
    };
    expect(generateXmlTag('data', attributes)).toBe('<data count="10" enabled="false" />');
  });

  test('should properly escape special XML characters in attribute values', () => {
    const attributes = {
      'data-info': '<"Hello" & \'World\'>',
    };
    expect(generateXmlTag('meta', attributes)).toBe(
      '<meta data-info="&lt;&quot;Hello&quot; &amp; &apos;World&apos;&gt;" />'
    );
  });

  test('should properly escape special XML characters in content', () => {
    const content = 'This content has <, >, &, ", and \' characters.';
    const expectedContent = 'This content has &lt;, &gt;, &amp;, &quot;, and &apos; characters.';
    expect(generateXmlTag('message', {}, content)).toBe(`<message>${expectedContent}</message>`);
  });

  test('should handle empty string content correctly', () => {
    expect(generateXmlTag('div', {}, '')).toBe('<div></div>');
  });

  test('should handle an empty attributes object correctly', () => {
    expect(generateXmlTag('span', {})).toBe('<span />');
    expect(generateXmlTag('span', {}, 'content')).toBe('<span>content</span>');
  });

  test('should handle attributes with empty string content', () => {
    const attributes = { id: 'empty' };
    expect(generateXmlTag('div', attributes, '')).toBe('<div id="empty"></div>');
  });
});
