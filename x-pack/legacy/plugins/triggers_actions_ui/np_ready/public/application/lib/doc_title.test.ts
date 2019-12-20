/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { docTitleService } from './doc_title';
import { coreMock } from '../../../../../../../../src/core/public/mocks';

describe('doc_title', () => {
  test('if change calls set proper breadcrumb title ', async () => {
    const core = coreMock.createStart();
    const spy = jest.spyOn(core.chrome.docTitle, 'change');
    docTitleService.init(spy);
    docTitleService.setTitle('home');
    docTitleService.setTitle('alerts');
    docTitleService.setTitle('connectors');
    expect(core.chrome.docTitle).toMatchInlineSnapshot(`
    Object {
      "__legacy": Object {
        "setBaseTitle": [MockFunction],
      },
      "change": [MockFunction] {
        "calls": Array [
          Array [
            "Alerts and Actions",
          ],
          Array [
            "Alerts",
          ],
          Array [
            "Connectors",
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": undefined,
          },
          Object {
            "type": "return",
            "value": undefined,
          },
          Object {
            "type": "return",
            "value": undefined,
          },
        ],
      },
      "reset": [MockFunction],
    }
    `);
  });
});
