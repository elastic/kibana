/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../common/lib/fetch');

import { getPdfUrl, createPdf } from './utils';
import { workpads } from '../../../../__tests__/fixtures/workpads';
import { fetch } from '../../../../common/lib/fetch';

const addBasePath = jest.fn().mockImplementation(s => `basepath/${s}`);
const workpad = workpads[0];

test('getPdfUrl returns the correct url', () => {
  const url = getPdfUrl(workpad, { pageCount: 2 }, addBasePath);

  expect(url).toMatchInlineSnapshot(
    `"basepath//api/reporting/generate/printablePdf?jobParams=(browserTimezone:America%2FPhoenix,layout:(dimensions:(height:0,width:0),id:preserve_layout),objectType:'canvas%20workpad',relativeUrls:!(%2Fapp%2Fcanvas%23%2Fexport%2Fworkpad%2Fpdf%2Fbase-workpad%2Fpage%2F1,%2Fapp%2Fcanvas%23%2Fexport%2Fworkpad%2Fpdf%2Fbase-workpad%2Fpage%2F2),title:'base%20workpad')"`
  );
});

test('createPdf posts to create the pdf', () => {
  createPdf(workpad, { pageCount: 2 }, addBasePath);

  expect(fetch.post).toBeCalled();

  const args = (fetch.post as jest.MockedFunction<typeof fetch.post>).mock.calls[0];

  expect(args[0]).toMatchInlineSnapshot(`"basepath//api/reporting/generate/printablePdf"`);
  expect(args[1]).toMatchInlineSnapshot(`
    Object {
      "jobParams": "(browserTimezone:America/Phoenix,layout:(dimensions:(height:0,width:0),id:preserve_layout),objectType:'canvas workpad',relativeUrls:!(/app/canvas#/export/workpad/pdf/base-workpad/page/1,/app/canvas#/export/workpad/pdf/base-workpad/page/2),title:'base workpad')",
    }
  `);
});
