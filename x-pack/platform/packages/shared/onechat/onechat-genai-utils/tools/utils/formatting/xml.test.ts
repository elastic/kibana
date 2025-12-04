/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { XmlNode } from './xml';
import { generateXmlTree } from './xml'; // Assuming the new file is also named 'xml.ts'

describe('generateXmlTree', () => {
  // These tests cover the same ground as the original tests for generateXmlTag,
  // ensuring no functionality was lost in the refactor.
  describe('Basic Tag Generation (Legacy Compatibility)', () => {
    test('should create a simple self-closing tag for a node with no children', () => {
      const node: XmlNode = { tagName: 'br' };
      expect(generateXmlTree(node)).toBe('<br />');
    });

    test('should create a simple tag with content when the only child is a string', () => {
      const node: XmlNode = { tagName: 'p', children: ['Hello World'] };
      expect(generateXmlTree(node)).toBe('<p>Hello World</p>');
    });

    test('should create a self-closing tag with multiple attributes', () => {
      const node: XmlNode = {
        tagName: 'field',
        attributes: { path: 'user.name', type: 'keyword', indexed: true },
      };
      expect(generateXmlTree(node)).toBe(
        '<field path="user.name" type="keyword" indexed="true" />'
      );
    });

    test('should create a single-line tag with both attributes and content', () => {
      const node: XmlNode = {
        tagName: 'div',
        attributes: { class: 'greeting' },
        children: ['Hello Again'],
      };
      expect(generateXmlTree(node)).toBe('<div class="greeting">Hello Again</div>');
    });

    test('should ignore attributes with null or undefined values', () => {
      const node: XmlNode = {
        tagName: 'section',
        attributes: {
          id: 'main',
          'data-value': null,
          'aria-label': undefined,
          role: 'main',
        },
      };
      expect(generateXmlTree(node)).toBe('<section id="main" role="main" />');
    });

    test('should properly escape special XML characters in attribute values', () => {
      const node: XmlNode = {
        tagName: 'meta',
        attributes: { 'data-info': `<"Hello" & 'World'>` },
      };
      expect(generateXmlTree(node)).toBe(
        `<meta data-info="&lt;&quot;Hello&quot; &amp; &apos;World&apos;&gt;" />`
      );
    });

    test('should properly escape special XML characters in string children', () => {
      const node: XmlNode = {
        tagName: 'message',
        children: [`This content has <, >, &, ", and ' characters.`],
      };
      const expectedContent = `This content has &lt;, &gt;, &amp;, &quot;, and &apos; characters.`;
      expect(generateXmlTree(node)).toBe(`<message>${expectedContent}</message>`);
    });

    test('should handle an empty string child correctly', () => {
      const node: XmlNode = { tagName: 'div', children: [''] };
      expect(generateXmlTree(node)).toBe('<div></div>');
    });
  });

  // These tests verify the new core functionality: nesting and indentation.
  describe('Nesting and Indentation', () => {
    test('should correctly indent a single nested node', () => {
      const tree: XmlNode = {
        tagName: 'parent',
        children: [{ tagName: 'child' }],
      };
      const expected = [
        //
        '<parent>',
        '  <child />',
        '</parent>',
      ].join('\n');
      expect(generateXmlTree(tree)).toBe(expected);
    });

    test('should correctly indent multiple sibling nodes', () => {
      const tree: XmlNode = {
        tagName: 'list',
        children: [
          { tagName: 'item', attributes: { id: 1 } },
          { tagName: 'item', attributes: { id: 2 } },
        ],
      };
      const expected = [
        //
        '<list>',
        '  <item id="1" />',
        '  <item id="2" />',
        '</list>',
      ].join('\n');
      expect(generateXmlTree(tree)).toBe(expected);
    });

    test('should handle deep (multi-level) nesting', () => {
      const tree: XmlNode = {
        tagName: 'root',
        children: [
          {
            tagName: 'level1',
            children: [
              {
                tagName: 'level2',
                attributes: { status: 'nested' },
                children: ['Deep content'],
              },
            ],
          },
        ],
      };
      const expected = [
        //
        '<root>',
        '  <level1>',
        '    <level2 status="nested">Deep content</level2>',
        '  </level1>',
        '</root>',
      ].join('\n');
      expect(generateXmlTree(tree)).toBe(expected);
    });

    test('should handle mixed content (nodes and strings) correctly', () => {
      const tree: XmlNode = {
        tagName: 'p',
        children: [
          'This is some text, followed by a ',
          { tagName: 'strong', children: ['bold section'] },
          ', and then more text.',
        ],
      };
      const expected = [
        //
        '<p>',
        '  This is some text, followed by a ',
        '  <strong>bold section</strong>',
        '  , and then more text.',
        '</p>',
      ].join('\n');
      expect(generateXmlTree(tree)).toBe(expected);
    });
  });

  // These tests check the optional configuration parameters.
  describe('Custom Options', () => {
    const tree: XmlNode = {
      tagName: 'a',
      children: [{ tagName: 'b' }],
    };

    test('should use a custom indentation character (tabs)', () => {
      const expected = ['<a>', '\t<b />', '</a>'].join('\n');
      expect(generateXmlTree(tree, { indentChar: '\t' })).toBe(expected);
    });

    test('should use a custom indentation character (four spaces)', () => {
      const expected = ['<a>', '    <b />', '</a>'].join('\n');
      expect(generateXmlTree(tree, { indentChar: '    ' })).toBe(expected);
    });

    test('should apply an initial indentation level', () => {
      const expected = ['  <a>', '    <b />', '  </a>'].join('\n');
      expect(generateXmlTree(tree, { initialIndentLevel: 1 })).toBe(expected);
    });

    test('should combine initial indent level and custom indent character', () => {
      const expected = ['\t<a>', '\t\t<b />', '\t</a>'].join('\n');
      expect(generateXmlTree(tree, { indentChar: '\t', initialIndentLevel: 1 })).toBe(expected);
    });
  });

  describe('escapeContent option', () => {
    test('should escape content by default', () => {
      const node: XmlNode = {
        tagName: 'code',
        children: ['<div>Hello</div>'],
      };
      expect(generateXmlTree(node)).toBe('<code>&lt;div&gt;Hello&lt;/div&gt;</code>');
    });

    test('should not escape content when escapeContent is false', () => {
      const node: XmlNode = {
        tagName: 'code',
        children: ['<div>Hello</div>'],
      };
      expect(generateXmlTree(node, { escapeContent: false })).toBe('<code><div>Hello</div></code>');
    });

    test('should not escape nested string children when escapeContent is false', () => {
      const tree: XmlNode = {
        tagName: 'wrapper',
        children: [{ tagName: 'item', children: ['<b>bold</b>'] }, '<raw>content</raw>'],
      };
      const expected = [
        '<wrapper>',
        '  <item><b>bold</b></item>',
        '  <raw>content</raw>',
        '</wrapper>',
      ].join('\n');
      expect(generateXmlTree(tree, { escapeContent: false })).toBe(expected);
    });

    test('should still escape attribute values even when escapeContent is false', () => {
      const node: XmlNode = {
        tagName: 'div',
        attributes: { 'data-info': '<test>' },
        children: ['<span>raw</span>'],
      };
      expect(generateXmlTree(node, { escapeContent: false })).toBe(
        '<div data-info="&lt;test&gt;"><span>raw</span></div>'
      );
    });
  });
});
