/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Journey } from '@kbn/journeys';
import { subj } from '@kbn/test-subj-selector';
import { times } from 'lodash';
import type { Page } from 'playwright';

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
  })

  /**
   * Test performance of the editor when suggesting/validating large number of fields in functions, commands and options.
   */
  .step('Type a new query', async ({ page }) => {
    await clearESQLEditorQuery(page);

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
  | ENRICH policy
  | LOOKUP JOIN lookup_index ON col0
  | CHANGE_POINT _all.primaries.bulk.avg_time_in_millis
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
    await clearESQLEditorQuery(page);

    const largeQuery = buildLargeQuery(100);

    await pasteESQLEditorQuery(largeQuery, page);
    await typeESQLEditorQuery(`| RENAME col0 AS renamed_field | KEEP renamed_field`, page, 200);
  });

// === UTILS ===========================================================================

const clearESQLEditorQuery = async (page: Page) => {
  const editor = await getEditor(page);
  await editor.clear();
};

const typeESQLEditorQuery = async (value: string, page: Page, typingDelay: number) => {
  const editor = await getEditor(page);
  await editor.pressSequentially(value, { delay: typingDelay, timeout: 0 });
};

const pasteESQLEditorQuery = async (value: string, page: Page) => {
  const editor = await getEditor(page);
  // Monaco can intercept pointer events over the hidden textarea; focusing avoids click flakiness.
  await editor.focus();
  await page.keyboard.insertText(value);
};

const getEditor = async (page: Page) => {
  const editor = page.locator(subj('ESQLEditor'));
  const textarea = editor.locator('textarea').first();
  await textarea.waitFor();
  return textarea;
};

const buildLargeQuery = (numEvals: number) => {
  const evalLines = times(numEvals, (colIndex) => {
    return `| EVAL col${colIndex} = CLAMP(TO_INTEGER(_all.primaries.docs.count), _all.primaries.bulk.avg_size_in_bytes))`;
  });

  const largeQuery = ['FROM indices-stats*', ...evalLines].join('\n');
  return largeQuery;
};
