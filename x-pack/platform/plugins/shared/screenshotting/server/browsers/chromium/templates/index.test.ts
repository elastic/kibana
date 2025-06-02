/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHeaderTemplate, getFooterTemplate, getDefaultFooterLogo } from '.';

let defaultFooterLogo: string;

describe('templates/index', () => {
  beforeAll(async () => {
    defaultFooterLogo = (await getDefaultFooterLogo()).trim();
  });

  describe('getHeaderTemplate()', () => {
    it('works with a plain logo', async () => {
      const title = 'plain';
      const result = await getHeaderTemplate({ title });
      expect(result).toBe(getHeader(title));
    });
    it('works with an html title', async () => {
      const title = '<b>html</b>';
      const result = await getHeaderTemplate({ title });
      expect(result).toBe(getHeader('&lt;b&gt;html&lt;/b&gt;'));
    });
  });

  describe('getFooterTemplate()', () => {
    it('works with no logo', async () => {
      const result = await getFooterTemplate({});
      expect(result).toBe(getFooter());
    });
    it('works with a plain logo', async () => {
      const logo = 'http://example.com/favico.ico';
      const result = await getFooterTemplate({ logo });
      expect(result).toBe(getFooter(logo));
    });
    it('works with an html logo', async () => {
      const logo = '"/><img src="';
      const result = await getFooterTemplate({ logo });
      expect(result).toBe(getFooter('&quot;/&gt;&lt;img src&#x3D;&quot;'));
    });
  });
});

function getHeader(title: string): string {
  return `
<style>
  .myTitle {
    font-size: 8px;
    color: #aaa;
    font-family: system-ui;
    text-align: center;
    width: 100%;
  }
</style>
<span class="myTitle">${title}</span>
`.trimStart();
}

function getFooter(logo?: string): string {
  const hasLogo = !!logo;

  if (!hasLogo) {
    logo = defFooterLogo();
  }
  return `
<style>
  div.container {
    position: relative;
    font-size: 10px;
    font-family: system-ui;
    text-align: center;
    color: #aaa;
    width: 100%;
  }
  div.pages {
    position: absolute;

    left: 50%;
    transform: translateX(-50%);

    bottom: 3mm;

    text-align: center;
  }
  img.logo {
    position: absolute;

    left: 2mm;
    bottom: 3mm;

    overflow: hidden;
  }

  div.poweredByElastic {
    position: absolute;
    color: #aaa;
    font-size: 2mm;

    left: 2mm;
    bottom: 0;
  }
</style>
<div class="container">
  <!-- DPI is 72/96 so scaling of all values here must * 0.75 to get values on page  -->
  <img class="logo" height="30mm" width="80mm" src="${logo}" />
${getPoweredBy(hasLogo)}  <div class="pages">
    <span class="pageNumber"></span>&nbsp;of&nbsp;<span class="totalPages"></span>
  </div>
</div>
`.trimStart();
}

function getPoweredBy(hasLogo: boolean): string {
  if (!hasLogo) return '';
  return `  <div class="poweredByElastic">Powered by Elastic</div>\n`;
}

function defFooterLogo(): string {
  return defaultFooterLogo!;
}
