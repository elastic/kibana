/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sharedI18nTexts } from './shared_i18n_texts';

describe('sharedI18nTexts', () => {
  describe('notRetriedError', () => {
    it('explains that a report was not retried when the browser closed unexpectedly', () => {
      expect(
        sharedI18nTexts.notRetriedError('browser_unexpectedly_closed_error')
      ).toMatchInlineSnapshot(
        `"Can't generate this report because the browser closed unexpectedly. The report was not retried because it would likely fail again. Try reducing the amount of data in the report."`
      );
    });

    it('explains that a report was not retried when the PDF worker ran out of memory', () => {
      expect(
        sharedI18nTexts.notRetriedError('pdf_worker_out_of_memory_error')
      ).toMatchInlineSnapshot(
        `"Can't generate a PDF due to insufficient memory. The report was not retried because it would likely fail again. Try making a smaller PDF."`
      );
    });

    it.each([
      ['a retried error', 'browser_screenshot_error'],
      ['no error code', undefined],
    ])('is undefined for %s', (_name, errorCode) => {
      expect(sharedI18nTexts.notRetriedError(errorCode)).toBeUndefined();
    });
  });
});
