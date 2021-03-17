/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function MonacoEditorProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');

  return new (class MonacoEditor {
    public async getCodeEditorValue() {
      let request: string = '';

      await retry.try(async () => {
        request = await browser.execute(
          () => (window as any).MonacoEnvironment.monaco.editor.getModels()[0].getValue() as string
        );
      });

      return request;
    }
  })();
}
