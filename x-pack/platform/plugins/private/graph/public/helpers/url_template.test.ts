/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUrlTemplateValid, urlTemplatePlaceholder } from './url_template';

describe('isUrlTemplateValid', () => {
  it('accepts http URLs that contain the placeholder', () => {
    expect(isUrlTemplateValid(`http://elastic.co/${urlTemplatePlaceholder}`)).toBe(true);
  });

  it('accepts mailto URLs that contain the placeholder', () => {
    const mailtoTemplate = `mailto:test@elastic.co?subject=${urlTemplatePlaceholder}`;
    expect(isUrlTemplateValid(mailtoTemplate)).toBe(true);
  });

  it('accepts https URLs that contain the placeholder', () => {
    expect(isUrlTemplateValid(`https://elastic.co/${urlTemplatePlaceholder}`)).toBe(true);
  });

  it('accepts relative URLs by resolving against the current origin', () => {
    const relativeUrl = `/app/discover/${urlTemplatePlaceholder}`;
    expect(isUrlTemplateValid(relativeUrl)).toBe(true);
  });

  it('rejects URLs using unsupported protocols even with the placeholder', () => {
    const ftpUrl = `ftp://elastic.co/${urlTemplatePlaceholder}`;
    expect(isUrlTemplateValid(ftpUrl)).toBe(false);
  });

  it('rejects URLs that do not contain the placeholder', () => {
    const missingPlaceholder = 'https://elastic.co/app/discover';
    expect(isUrlTemplateValid(missingPlaceholder)).toBe(false);
  });

  it('rejects URLs that cannot be parsed', () => {
    const unparsableUrl = `//`;
    expect(isUrlTemplateValid(unparsableUrl)).toBe(false);
  });

  it('rejects javascript URLs to prevent script execution', () => {
    const javascriptUrl = `javascript:alert(${urlTemplatePlaceholder})`;
    expect(isUrlTemplateValid(javascriptUrl)).toBe(false);
  });
});
