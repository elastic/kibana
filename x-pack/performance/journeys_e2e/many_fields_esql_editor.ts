/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { times } from 'lodash';
import type { Locator, Page } from 'playwright';
import type { monaco } from '@kbn/monaco';

interface WithMonacoEnvironment {
  MonacoEnvironment: {
    monaco: typeof monaco;
  };
}

export const journey = new Journey({
  kbnArchives: ['src/platform/test/functional/fixtures/kbn_archiver/many_fields_data_view'],
  esArchives: ['src/platform/test/functional/fixtures/es_archiver/many_fields'],
})
  .step('Go to Discover Page', async ({ page, kbnUrl, kibanaPage }) => {
    await page.goto(
      kbnUrl.get(
        `/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-15m,to:now))&_a=(columns:!(),dataSource:(type:esql),filters:!(),hideChart:!f,interval:auto,query:(esql:'FROM index'),sort:!())`
      )
    );
    await kibanaPage.waitForHeader();
    await page.locator(subj('ESQLEditor')).locator('textarea').first().waitFor();
  })

  /**
   * Test performance of the editor when suggesting/validating large number of fields in functions, commands and options.
   * Test is split for typing in two different speeds.
   */
  .step('Type a new query', async ({ page }) => {
    await setMonacoEditorValue('', page);

    await typeESQLEditorQuery(
      `FROM indices-stats* METADATA _id, _index, _score
  | WHERE _all.primaries.bulk.avg_time != ""
  | EVAL col0 = TRIM(_all.primaries.bulk.total_time)
  | INLINE STATS col1 = AVG(_all.primaries.docs.count) BY _all.primaries.bulk.avg_time
  | SORT col0 DESC
  | DROP _all.primaries.bulk.total_time
  | RENAME _all.primaries.bulk.avg_size_in_bytes as col3
  | DISSECT _all.primaries.bulk.avg_time.keyword  "%{b} %{c}" APPEND_SEPARATOR = ";"
  | GROK _all.primaries.completion.size "%{IP:b} %{NUMBER:c}"`,
      page,
      50
    );

    await typeESQLEditorQuery(
      `
  | ENRICH policy | CHANGE_POINT _all.primaries.bulk.avg_time_in_millis
  | LOOKUP JOIN lookup_index ON col0
  | COMPLETION "query" WITH { "inference_id": "endpoint" }
  | FORK (KEEP _all.primaries.bulk.avg_time_in_millis) (STATS ABS(_all.primaries.bulk.avg_time_in_millis) BY col0)
  | FUSE linear
  | RERANK "Your search query"
  | SAMPLE .001
  | KEEP col0`,
      page,
      100
    );
  })

  /**
   * Test performance of the editor after a long query. To stress columns collection routines.
   */
  .step('Paste a large query and edit it ', async ({ page }) => {
    await setMonacoEditorValue('', page);

    const largeQuery = buildLargeQuery(100);

    await setMonacoEditorValue(largeQuery, page);
    await typeESQLEditorQuery(`| RENAME col0 AS renamed_field | KEEP renamed_field`, page, 200);
  });

// === UTILS ===========================================================================

/**
 * Types the given string letter by letter.
 */
const typeESQLEditorQuery = async (value: string, page: Page, typingDelay: number) => {
  const editor = await getEditor(page);
  await moveCursorToEnd(page, editor);
  await editor.pressSequentially(value, { delay: typingDelay, timeout: 0 });
};

/**
 * Moves the cursor to the end of the given textarea.
 */
const moveCursorToEnd = async (page: Page, textarea: Locator) => {
  await textarea.focus();
  if (process.platform === 'darwin') {
    await page.keyboard.press('Meta+ArrowDown');
  } else {
    await page.keyboard.press('Control+End');
  }
};

/**
 * Returns the Monaco editor textarea instance.
 */
const getEditor = async (page: Page) => {
  const editor = page.locator(subj('ESQLEditor'));
  const textarea = editor.locator('textarea').first();
  await textarea.waitFor();
  return textarea;
};

/**
 * This helper sets the value of a Monaco editor instance.
 * This method is used as it's a LOT faster than using .fill().
 */
const setMonacoEditorValue = async (value: string, page: Page) => {
  // Wait for Monaco to be ready
  await page.waitForFunction(() => {
    // The monaco property is guaranteed to exist as it's value is provided in @kbn/monaco for this specific purpose, see {@link src/platform/packages/shared/kbn-monaco/src/register_globals.ts}
    const monacoEditor = (window as unknown as WithMonacoEnvironment).MonacoEnvironment.monaco
      .editor;
    return Boolean(monacoEditor?.getModels && monacoEditor.getModels().length);
  });

  // Set the value directly via Monaco's API
  await page.evaluate(
    ({ codeEditorValue }) => {
      const editor = (window as unknown as WithMonacoEnvironment).MonacoEnvironment.monaco.editor;
      const models = editor.getModels();
      models[0].setValue(codeEditorValue);
    },
    { codeEditorValue: value }
  );

  // Assert the value has been set correctly
  await page.waitForFunction(
    ({ expected }) => {
      const editor = (window as unknown as WithMonacoEnvironment).MonacoEnvironment.monaco.editor;
      const model = editor.getModels()[0];
      return model ? model.getValue() === expected : false;
    },
    { expected: value }
  );
};

/**
 * Builds a large ESQL query with the given number of EVAL statements.
 */
const buildLargeQuery = (linesNumber: number) => {
  const evalLines = times(linesNumber, (colIndex) => {
    return `| EVAL col${colIndex} = CLAMP(TO_INTEGER(_all.primaries.docs.count), 55, 300)`;
  });

  const largeQuery = ['FROM indices-stats*', ...evalLines].join('\n');
  return largeQuery;
};
