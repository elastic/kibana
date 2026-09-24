/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBase64Encoded, sanitizeSvg } from './svg';

describe('isBase64Encoded', () => {
  it('should return true for valid base64 encoded strings', () => {
    // Simple text encoded in base64
    expect(isBase64Encoded('SGVsbG8gV29ybGQ=')).toBe(true); // "Hello World"

    // JSON object encoded in base64
    expect(isBase64Encoded('eyJuYW1lIjoiSm9obiIsImFnZSI6MzB9')).toBe(true); // {"name":"John","age":30}

    // Binary data encoded in base64
    const binaryData = Buffer.from([0x00, 0xff, 0x10, 0x88]).toString('base64');
    expect(isBase64Encoded(binaryData)).toBe(true);
  });

  it('should return false for non-base64 encoded strings', () => {
    // Empty string
    expect(isBase64Encoded('')).toBe(false);

    // Plain text
    expect(isBase64Encoded('Hello World')).toBe(false);

    // Invalid base64 characters
    expect(isBase64Encoded('SGVsbG8gV29ybGQ=!')).toBe(false);

    // Missing padding
    expect(isBase64Encoded('SGVsbG8gV29ybGQ')).toBe(false);

    // URL without encoding
    expect(isBase64Encoded('https://example.com')).toBe(false);

    // JSON without encoding
    expect(isBase64Encoded('{"name":"John","age":30}')).toBe(false);
  });

  it('should return false for non-string inputs', () => {
    expect(isBase64Encoded(null)).toBe(false);
    expect(isBase64Encoded(undefined)).toBe(false);
    expect(isBase64Encoded(123)).toBe(false);
    expect(isBase64Encoded({})).toBe(false);
    expect(isBase64Encoded([])).toBe(false);
    expect(isBase64Encoded(Buffer.from('test'))).toBe(false);
  });

  it('should handle edge cases correctly', () => {
    // Base64 that decodes to non-printable characters
    expect(isBase64Encoded('AAAA')).toBe(true); // [0, 0, 0]

    // Base64 with many padding characters
    expect(isBase64Encoded('YQ==')).toBe(true); // "a"

    // Base64 with no padding needed
    expect(isBase64Encoded('YWJj')).toBe(true); // "abc"

    // Very long base64 string
    const longString = 'A'.repeat(1000);
    const longBase64 = Buffer.from(longString).toString('base64');
    expect(isBase64Encoded(longBase64)).toBe(true);
  });

  it('should handle SVG content encoded in base64', () => {
    // Simple SVG encoded in base64
    const svgBase64 = Buffer.from(
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>'
    ).toString('base64');
    expect(isBase64Encoded(svgBase64)).toBe(true);
  });
});

describe('sanitizeSvg', () => {
  beforeAll(() => {
    // Pre-warm the lazy-loaded jsdom/dompurify modules so individual test
    // timings are not skewed by the one-time CJS module resolution cost.
    sanitizeSvg(Buffer.from('<svg></svg>'));
  });

  it('should process a simple SVG string and return a Buffer', () => {
    const svg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>';
    const result = sanitizeSvg(Buffer.from(svg));

    // Check that result is a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');

    // Notice that DOMPurify may change self-closing tags to explicit closing tags
    expect(resultStr).toEqual(
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40"></circle></svg>'
    );
  });

  it('should properly decode and sanitize base64 encoded SVG', () => {
    // Base64 encoded: <svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>
    const base64Svg =
      'PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIC8+PC9zdmc+';
    const result = sanitizeSvg(Buffer.from(base64Svg));

    // Check that result is a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
  });

  it('should remove script tags from SVG', () => {
    const maliciousSvg =
      '<svg width="100" height="100"><script>alert("XSS")</script><circle cx="50" cy="50" r="40" /></svg>';
    const result = sanitizeSvg(Buffer.from(maliciousSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).not.toContain('<script');
    expect(resultStr).not.toContain('alert("XSS")');
  });

  it('should remove onclick attributes from SVG', () => {
    const maliciousSvg =
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40" onclick="alert(\'XSS\')" /></svg>';
    const result = sanitizeSvg(Buffer.from(maliciousSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).not.toContain('onclick');
    expect(resultStr).not.toContain('alert');
  });

  it('should handle SVG with XML declaration', () => {
    const svg =
      '<?xml version="1.0" standalone="no"?><svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>';
    const result = sanitizeSvg(Buffer.from(svg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
  });

  it('should handle base64 encoded SVG with XML declaration', () => {
    // Base64 encoded: <?xml version="1.0" standalone="no"?><svg width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>
    const base64Svg =
      'PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pjxzdmcgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQwIiAvPjwvc3ZnPg==';
    const result = sanitizeSvg(Buffer.from(base64Svg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
  });

  it('should remove all forbidden tags while preserving safe ones', () => {
    const maliciousSvg = `
      <svg width="100" height="100">
        <script>alert("bad")</script>
        <style>body { background: red; }</style>
        <iframe src="https://evil.com"></iframe>
        <object data="evil.swf"></object>
        <form action="https://evil.com"><input type="text" /></form>
        <foreignObject height="1" width="1"><div>XSS</div></foreignObject>
        <circle cx="50" cy="50" r="40"/>
        <rect x="50" y="50" width="50" height="50"/>
      </svg>
    `;

    // Test that forbidden tags are removed
    const result = sanitizeSvg(Buffer.from(maliciousSvg));
    const resultStr = result.toString('utf8');

    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).toContain('<rect');
    expect(resultStr).not.toContain('<script');
    expect(resultStr).not.toContain('<style');
    expect(resultStr).not.toContain('<iframe');
    expect(resultStr).not.toContain('<object');
    expect(resultStr).not.toContain('<form');
    expect(resultStr).not.toContain('<foreignObject');
  });

  it('should remove all forbidden attributes', () => {
    const maliciousSvg = `
      <svg width="100" height="100">
        <circle
          cx="50"
          cy="50"
          r="40"
          onerror="alert('error')"
          onload="alert('loaded')"
          onclick="alert('clicked')"
          onmouseover="alert('hover')"
          xlink:href="javascript:alert('xlink')"
          href="javascript:alert('href')"
          src="https://evil.com/evil.js"
          data="data:text/javascript,alert('data')"
        />
      </svg>
    `;
    const result = sanitizeSvg(Buffer.from(maliciousSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<circle');
    expect(resultStr).not.toContain('onerror');
    expect(resultStr).not.toContain('onload');
    expect(resultStr).not.toContain('onclick');
    expect(resultStr).not.toContain('onmouseover');
    expect(resultStr).not.toContain('xlink:href');
    expect(resultStr).not.toContain('href');
    expect(resultStr).not.toContain('src');
    expect(resultStr).not.toContain('data');
  });

  it('should handle non-base64 strings that look like base64', () => {
    // This looks like base64 but doesn't decode to valid SVG
    const fakeSvg = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=';
    expect(() => sanitizeSvg(Buffer.from(fakeSvg))).not.toThrow();
    const result = sanitizeSvg(Buffer.from(fakeSvg));

    // Check that result is a Buffer
    expect(Buffer.isBuffer(result)).toBe(true);

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toBeTruthy();
    expect(resultStr).not.toContain('<svg');
  });

  it('should handle complex nested SVG elements', () => {
    const complexSvg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
          </linearGradient>
        </defs>
        <g fill="url(#gradient)">
          <path d="M 0,100 C 0,0 200,0 200,100 C 200,200 0,200 0,100 z" />
        </g>
      </svg>
    `;
    const result = sanitizeSvg(Buffer.from(complexSvg));

    // Convert to string for content verification
    const resultStr = result.toString('utf8');
    expect(resultStr).toContain('<svg');
    expect(resultStr).toContain('<defs>');
    expect(resultStr).toContain('<linearGradient');
    expect(resultStr).toContain('<stop');
    expect(resultStr).toContain('<g');
    expect(resultStr).toContain('<path');
  });
});

describe('sanitizeSvg style inlining', () => {
  const sanitize = (svg: string): string => sanitizeSvg(Buffer.from(svg)).toString('utf8');
  const sanitizeWithoutStyles = (svg: string): string =>
    sanitize(svg.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ''));

  it('inlines class-based hex and gradient fills and still strips <style>', () => {
    const result = sanitize(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 75"><defs>' +
        '<style>.cls-1{fill:url(#GreenGradient);}.cls-2{fill:#fff;}</style>' +
        '<linearGradient id="GreenGradient"><stop offset="0" stop-color="#1b660f"/></linearGradient>' +
        '</defs><rect class="cls-1" width="75" height="75"/><path class="cls-2" d="M0 0h10v10z"/></svg>'
    );

    expect(result).not.toContain('<style');
    expect(result).toMatch(/<rect[^>]*fill="url\(#GreenGradient\)"/);
    expect(result).toMatch(/<path[^>]*fill="#fff"/);
    expect(result).toMatch(/<linearGradient[^>]*id="GreenGradient"/);
  });

  it('inlines every supported property', () => {
    const result = sanitize(
      '<svg><style>.a{fill:none;stroke:#6C55FF;stroke-width:0.885;stroke-miterlimit:10;' +
        'stroke-dasharray:2,3;stroke-linejoin:round;fill-rule:evenodd;clip-rule:evenodd;' +
        'clip-path:url(#clip);opacity:.5}</style><path class="a" d="M0 0"/></svg>'
    );

    for (const attribute of [
      'fill="none"',
      'stroke="#6C55FF"',
      'stroke-width="0.885"',
      'stroke-miterlimit="10"',
      'stroke-dasharray="2,3"',
      'stroke-linejoin="round"',
      'fill-rule="evenodd"',
      'clip-rule="evenodd"',
      'clip-path="url(#clip)"',
      'opacity=".5"',
    ]) {
      expect(result).toContain(attribute);
    }
  });

  it('lets the later rule win when an element has multiple classes', () => {
    expect(
      sanitize('<svg><style>.a{fill:#f00}.b{fill:#00f}</style><rect class="a b"/></svg>')
    ).toMatch(/fill="#00f"/);
    expect(
      sanitize('<svg><style>.b{fill:#00f}.a{fill:#f00}</style><rect class="a b"/></svg>')
    ).toMatch(/fill="#f00"/);
  });

  it('lets a class beat the svg type selector regardless of order', () => {
    expect(
      sanitize('<svg class="root"><style>.root{fill:#f00}svg{fill:#00f}</style><rect/></svg>')
    ).toMatch(/<svg[^>]*fill="#f00"/);
  });

  it('applies a root svg type selector', () => {
    expect(sanitize('<svg><style>svg{fill:#123456}</style><rect/></svg>')).toMatch(
      /<svg[^>]*fill="#123456"/
    );
  });

  it('keeps cascade order across style elements', () => {
    expect(
      sanitize(
        '<svg><style>.a{fill:#f00}</style><style>.a{fill:#00f}</style><rect class="a"/></svg>'
      )
    ).toMatch(/fill="#00f"/);
  });

  it('overrides existing presentation attributes and keeps inline style attributes', () => {
    const result = sanitize(
      '<svg><style>.a{fill:#f00}</style><rect class="a" fill="black" style="fill:green"/></svg>'
    );

    expect(result).toMatch(/fill="#f00"/);
    expect(result).not.toContain('fill="black"');
    expect(result).toMatch(/style="fill:green"/);
  });

  it('falls back when a supported property has an unsupported value', () => {
    const resurrectingSvg =
      '<svg><style>.a{fill:#f00}.b{fill:blue}</style><rect class="a b" fill="green"/></svg>';

    expect(sanitize(resurrectingSvg)).toEqual(sanitizeWithoutStyles(resurrectingSvg));
    expect(sanitize(resurrectingSvg)).toMatch(/fill="green"/);

    for (const svg of [
      '<svg><style>.a{fill:notacolor}</style><rect class="a" fill="green"/></svg>',
      '<svg><style>.a{stroke-width:nope}</style><rect class="a" stroke-width="2"/></svg>',
      '<svg><style>.a{stroke-width:1.px}</style><rect class="a" stroke-width="2"/></svg>',
      '<svg><style>.a{opacity:1.%}</style><rect class="a" opacity=".5"/></svg>',
      '<svg><style>.a{stroke-miterlimit:0.5}</style><rect class="a"/></svg>',
    ]) {
      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back on external and scriptable values', () => {
    for (const rule of [
      '.a{fill:url(https://evil.example/x.svg#p)}',
      '.a{fill:url(evil.svg#p)}',
      '.a{stroke:url(//evil.example/y)}',
      '.a{fill:expression(alert(1))}',
      '.a{fill:\\75 rl(https://evil.example/z)}',
    ]) {
      const svg = `<svg><style>${rule}</style><rect class="a"/></svg>`;
      const result = sanitize(svg);

      expect(result).toEqual(sanitizeWithoutStyles(svg));
      expect(result).not.toContain('evil');
    }
  });

  it('drops properties that are not supported', () => {
    const result = sanitize(
      '<svg><style>.a{fill:#f00;background:blue;enable-background:new 0 0 1 1;display:none}</style>' +
        '<rect class="a"/></svg>'
    );

    expect(result).toMatch(/fill="#f00"/);
    expect(result).not.toMatch(/background|display/);
  });

  it('falls back on the all shorthand, which resets supported properties', () => {
    for (const rules of ['.a{fill:#f00;all:initial}', '.a{fill:#f00}.a{ALL:unset}']) {
      const svg = `<svg><style>${rules}</style><rect class="a" fill="green"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back on grouping that can hide declaration boundaries', () => {
    for (const rules of [
      '.a{--custom:(;fill:#f00;--end:);}',
      '.a{--custom:[;fill:#f00;--end:];}',
      '.a{--custom:(}.a{fill:#f00;)}',
      '.a{fill:url(#p;fill:#f00)}',
      '.a{transform:rotate(45deg);fill:#f00}',
    ]) {
      const svg = `<svg><style>${rules}</style><rect class="a" fill="green"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('ignores at-rules that cannot style elements', () => {
    const result = sanitize(
      '<svg><style>@import url(https://evil.example/a.css);@page :first{margin:0}' +
        '@font-face{font-family:x}@keyframes spin{from{opacity:0}to{opacity:1}}' +
        '.a{fill:#f00}</style><rect class="a"/></svg>'
    );

    expect(result).not.toContain('evil');
    expect(result).not.toContain('opacity');
    expect(result).toMatch(/fill="#f00"/);
  });

  it('falls back on at-rules that can style elements', () => {
    for (const atRule of [
      '@supports (display:block){.a{fill:#00f}}',
      '@media screen{.a{fill:#00f}}',
      '@media (min-width:0){.a{fill:#00f}}',
      '@media (prefers-color-scheme: dark){.a{fill:#555}}',
      '@layer base{.a{fill:#00f}}',
      '@layer base;',
      '@container (min-width:0){.a{fill:#00f}}',
      '@unknown{.a{fill:#00f}}',
    ]) {
      const svg = `<svg><style>.a{fill:#f00}${atRule}</style><rect class="a" fill="green"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back on @namespace, which constrains which elements selectors match', () => {
    for (const namespace of [
      '@namespace url(http://www.w3.org/1999/xhtml);',
      '@namespace svg url(http://www.w3.org/2000/svg);',
    ]) {
      const svg = `<svg><style>${namespace}.a{fill:#f00}</style><rect class="a" fill="green"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('does not write properties onto animation elements, where fill means something else', () => {
    const result = sanitize(
      '<svg><style>.a{fill:#f00;stroke:#00f}</style><rect class="a"/>' +
        '<rect><animateMotion class="a" fill="freeze" dur="1s" path="M0 0H10"/></rect>' +
        '<rect><animateTransform class="a" fill="freeze" attributeName="transform" type="rotate" to="90"/></rect>' +
        '</svg>'
    );

    expect(result).toMatch(/<rect class="a"[^>]*fill="#f00"/);
    expect(result).toMatch(/<animateMotion[^>]*fill="freeze"/i);
    expect(result).toMatch(/<animateTransform[^>]*fill="freeze"/i);
    expect(result).not.toMatch(/<animate\w*[^>]*stroke=/i);
  });

  it('falls back on titled style elements, which may be alternate stylesheets', () => {
    for (const styles of [
      '<style title="first">.a{fill:#00f}</style><style title="second">.a{fill:#f00}</style>',
      '<style title=" ">.a{fill:#f00}</style>',
    ]) {
      const svg = `<svg>${styles}<rect class="a" fill="green"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
    expect(sanitize('<svg><style title="">.a{fill:#f00}</style><rect class="a"/></svg>')).toMatch(
      /fill="#f00"/
    );
  });

  it('matches type and media attributes the way browsers do', () => {
    const inactiveType =
      '<svg><style type=" text/css ">.a{fill:#f00}</style><rect class="a" fill="green"/></svg>';

    expect(sanitize(inactiveType)).toEqual(sanitizeWithoutStyles(inactiveType));
    expect(sanitize(inactiveType)).toMatch(/fill="green"/);

    const unrecognizedMedia =
      '<svg><style media="screen\u00A0">.a{fill:#f00}</style><rect class="a" fill="green"/></svg>';

    expect(sanitize(unrecognizedMedia)).toEqual(sanitizeWithoutStyles(unrecognizedMedia));
    expect(
      sanitize(
        '<svg><style type="TEXT/CSS" media=" Screen\n">.a{fill:#f00}</style><rect class="a"/></svg>'
      )
    ).toMatch(/fill="#f00"/);
  });

  it('treats foreign default namespaces as not SVG, as XML parsing does', () => {
    for (const svg of [
      '<svg><style xmlns="urn:not-svg">.a{fill:#f00}</style><rect class="a" fill="green"/></svg>',
      '<svg><g xmlns="urn:not-svg"><style>.a{fill:#f00}</style></g><rect class="a" fill="green"/></svg>',
    ]) {
      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }

    const result = sanitize(
      '<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:#f00}</style>' +
        '<metadata><sfw xmlns="ns_sfw;"><slices/></sfw></metadata>' +
        '<rect class="a"/><g xmlns=""><rect class="a" fill="green"/></g></svg>'
    );

    expect(result).toMatch(/<rect class="a" fill="#f00"/);
    expect(result).toMatch(/<rect class="a" fill="green"/);
  });

  it('falls back on style elements with an unrecognized media attribute', () => {
    const svg =
      '<svg><style>.a{fill:#f00}</style><style media="screen and (min-width: 1px)">.a{fill:#00f}</style>' +
      '<rect class="a" fill="green"/></svg>';

    expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
  });

  it('falls back on whitespace and characters CSS does not treat like JavaScript does', () => {
    for (const svg of [
      '<svg><style>.a{fill:#f00}</style><rect class="a\u00A0b" fill="green"/></svg>',
      '<svg><style>.a{fill:#f00}</style><rect class="a\u000Bb" fill="green"/></svg>',
      '<svg><style>.a\u00A0{fill:#f00}</style><rect class="a" fill="green"/></svg>',
      '<svg><style>.a{fill:#0f0}.a{fill:#f00\u00A0}</style><rect class="a" fill="green"/></svg>',
      '<svg><style>.a{fill\u00A0:#f00}</style><rect class="a" fill="green"/></svg>',
      '<svg><style>\uFEFF.a{fill:#f00}</style><rect class="a" fill="green"/></svg>',
      '<svg><style>.a{fill:#f00\u000B}</style><rect class="a" fill="green"/></svg>',
      '<svg><style>.a{stro\u212Ae:#f00}</style><rect class="a" stroke="green"/></svg>',
    ]) {
      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('ignores conditional style elements', () => {
    const result = sanitize(
      '<svg><style media="print">.a{fill:#f00}</style>' +
        '<style type="text/less">.a{stroke:#f00}</style>' +
        '<style type="text/css" media="all">.a{opacity:.5}</style>' +
        '<rect class="a" fill="green"/></svg>'
    );

    expect(result).toMatch(/fill="green"/);
    expect(result).not.toContain('stroke=');
    expect(result).toMatch(/opacity=".5"/);
  });

  it('ignores CSS comments', () => {
    expect(
      sanitize('<svg><style>/* brand */.a{fill:#f00}/* end */</style><rect class="a"/></svg>')
    ).toMatch(/fill="#f00"/);
    expect(sanitize('<svg><style>.a{fill:url(#p)/* x */}</style><rect class="a"/></svg>')).toMatch(
      /fill="url\(#p\)"/
    );
  });

  it('falls back on comment markers inside url(), where CSS does not treat them as comments', () => {
    for (const rules of ['.a{fill:url(#p/*x*/)}', '.a{fill:url(#p/**/)}']) {
      const svg = `<svg><style>${rules}</style><rect class="a" fill="green"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back on quotes, escapes and malformed CSS', () => {
    for (const css of [
      '.a{fill:url("#g")}',
      '.b{content:"}"}.a{fill:#f00}',
      '.a{fill:\\23 f00}',
      '.a{fill:#f00',
      '.a{fill:#f00}}',
      '.a{.b{fill:#f00}}',
      '.a{fill}',
      '/* unterminated .a{fill:#f00}',
      '@media screen{.a{fill:#f00}',
    ]) {
      const svg = `<svg><style>${css}</style><rect class="a b"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back on unsupported selectors', () => {
    for (const svg of [
      '<svg><style>.a{fill:#f00}[fill]{fill:#00f}</style><rect class="a"/></svg>',
      '<svg><style>.a:not-a-real-pseudo{fill:#f00}.b{fill:#00f}</style><rect class="a b"/></svg>',
      '<svg><style>rect.a{fill:#f00}</style><rect class="a"/></svg>',
    ]) {
      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back on !important in any spelling, including overridden duplicates', () => {
    for (const rules of [
      '.a{fill:#f00 !important}.b{fill:#00f}',
      '.a{fill:#f00!important;fill:#00f}',
      '.a{fill:#f00 ! important}',
      '.a{fill:#f00 !IMPORTANT}',
    ]) {
      const svg = `<svg><style>${rules}</style><rect class="a b"/></svg>`;

      expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
    }
  });

  it('falls back when there are too many rules', () => {
    const rules = Array.from({ length: 300 }, (_, index) => `.c${index}{fill:#000}`).join('');
    const svg = `<svg><style>${rules}</style><rect class="c1"/></svg>`;

    expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
  });

  it('falls back when inlining would add too many bytes', () => {
    const dashArray = Array.from({ length: 16 }, () => '1').join(' ');
    const rects = Array.from({ length: 3000 }, () => '<rect class="a"/>').join('');
    const svg = `<svg><style>.a{stroke-dasharray:${dashArray}}</style>${rects}</svg>`;

    expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
  });

  it('falls back on dash arrays with too many entries', () => {
    const dashArray = Array.from({ length: 17 }, () => '1').join(' ');
    const svg = `<svg><style>.a{stroke-dasharray:${dashArray}}</style><rect class="a"/></svg>`;

    expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
  });

  it('inlines cheaply despite repeated selectors and classes', () => {
    const selectorList = Array.from({ length: 5000 }, () => '.a').join(',');
    const classList = Array.from({ length: 1000 }, () => 'a').join(' ');
    const rects = Array.from({ length: 10 }, () => `<rect class="${classList}"/>`).join('');
    const result = sanitize(`<svg><style>${selectorList}{fill:#f00}</style>${rects}</svg>`);

    expect(result.match(/fill="#f00"/g)).toHaveLength(10);
  });

  it('falls back when resolution exceeds the work budget', () => {
    const rules = Array.from({ length: 256 }, (_, index) => `.c${index}{fill:#000}`).join('');
    const classList = Array.from({ length: 256 }, (_, index) => `c${index}`).join(' ');
    const rects = Array.from({ length: 100 }, () => `<rect class="${classList}"/>`).join('');
    const svg = `<svg><style>${rules}</style>${rects}</svg>`;

    expect(sanitize(svg)).toEqual(sanitizeWithoutStyles(svg));
  });

  it('walks large SVGs in linear time', () => {
    const rects = Array.from({ length: 40_000 }, () => '<rect/>').join('');
    const startedAt = Date.now();
    sanitize(`<svg><style>.a{fill:#f00}</style>${rects}<rect class="a"/></svg>`);

    // A quadratic element walk takes well over ten seconds here; a linear one takes about one.
    expect(Date.now() - startedAt).toBeLessThan(5000);
  });

  it('inlines styles in base64-encoded SVGs', () => {
    const base64Svg = Buffer.from(
      '<svg><style>.a{fill:#f00}</style><rect class="a"/></svg>'
    ).toString('base64');
    const result = sanitizeSvg(Buffer.from(base64Svg)).toString('utf8');

    expect(result).not.toContain('<style');
    expect(result).toMatch(/fill="#f00"/);
  });

  it('keeps Inkscape SVGs with an XML declaration and namespaced attributes', () => {
    const result = sanitize(
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" ' +
        'inkscape:version="1.4.2" viewBox="0 0 10 10"><style>.a{fill:#f00}</style>' +
        '<rect class="a" width="10" height="10"/></svg>'
    );

    expect(result).toMatch(/<rect[^>]*fill="#f00"/);
  });
});
