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
   * Type query pipe by pipe at 50ms/char, waiting for validation to complete
   * between each pipe. This produces one validation data point per pipe addition,
   * covering a range of query lengths.
   */
  .step('Type a new query (fast, pipe by pipe)', async ({ page }) => {
    await setMonacoEditorValue('', page);

    const pipes = [
      `FROM indices-stats* METADATA _id, _index, _score`,
      `\n  | WHERE _all.primaries.bulk.avg_time != ""`,
      `\n  | EVAL col0 = TRIM(_all.primaries.bulk.total_time)`,
      `\n  | INLINE STATS col1 = AVG(_all.primaries.docs.count) BY _all.primaries.bulk.avg_time`,
      `\n  | SORT col0 DESC`,
      `\n  | DROP _all.primaries.bulk.total_time`,
      `\n  | RENAME _all.primaries.bulk.avg_size_in_bytes as col3`,
      `\n  | DISSECT _all.primaries.bulk.avg_time.keyword  "%{b} %{c}" APPEND_SEPARATOR = ";"`,
      `\n  | GROK _all.primaries.completion.size "%{IP:b} %{NUMBER:c}"`,
    ];

    for (let i = 0; i < pipes.length; i++) {
      await typeESQLEditorQuery(pipes[i], page, 50);
    }
  })

  /**
   * Continue the query at 100ms/char, still pipe by pipe.
   * Tests additional command types at a different typing cadence.
   */
  .step('Type additional commands (slower, pipe by pipe)', async ({ page }) => {
    const pipes = [
      `\n  | ENRICH policy | CHANGE_POINT _all.primaries.bulk.avg_time_in_millis`,
      `\n  | LOOKUP JOIN lookup_index ON col0`,
      `\n  | COMPLETION "query" WITH { "inference_id": "endpoint" }`,
      `\n  | FORK (KEEP _all.primaries.bulk.avg_time_in_millis) (STATS ABS(_all.primaries.bulk.avg_time_in_millis) BY col0)`,
      `\n  | FUSE linear`,
      `\n  | RERANK "Your search query"`,
      `\n  | SAMPLE .001`,
      `\n  | KEEP col0`,
    ];

    for (let i = 0; i < pipes.length; i++) {
      await typeESQLEditorQuery(pipes[i], page, 100);
    }
  })

  /**
   * Paste incrementally larger queries (10, 25, 50, 75, 100 EVAL lines) to
   * stress the column-resolution pipeline at different query sizes, then type
   * a final edit on top of the largest query.
   */
  .step('Paste incrementally larger queries and edit', async ({ page }) => {
    await setMonacoEditorValue('', page);

    for (const evalCount of [10, 25, 50, 75, 100]) {
      await setMonacoEditorValue(buildLargeQuery(evalCount), page);
    }

    await typeESQLEditorQuery(`\n| RENAME col0 AS renamed_field | KEEP renamed_field`, page, 100);
    await typeESQLEditorQuery(`\n| EVAL col90 = renamed_field`, page, 100);
  });

// === UTILS ===========================================================================

const countValidationMarks = (page: Page) =>
  page.evaluate(() => performance.getEntriesByName('esql-validation-complete', 'mark').length);

const waitForValidation = async (page: Page, baseline?: number) => {
  const marksBefore = baseline ?? (await countValidationMarks(page));

  await page
    .waitForFunction(
      ({ name, count }) => performance.getEntriesByName(name, 'mark').length > count,
      { name: 'esql-validation-complete', count: marksBefore },
      { timeout: 15000 }
    )
    .catch(() => {
      // eslint-disable-next-line no-console
      console.log(`Waited for too long for the validation to finish, continuing with the test...`);
    });
};

const typeESQLEditorQuery = async (value: string, page: Page, typingDelay: number) => {
  const editor = await getEditor(page);
  const marksBefore = await countValidationMarks(page);
  await moveCursorToEnd(page, editor);
  await editor.pressSequentially(value, { delay: typingDelay, timeout: 0 });
  await waitForValidation(page, marksBefore);
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

  const marksBefore = await countValidationMarks(page);

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
  await waitForValidation(page, marksBefore);
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
