/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaCodeEditorWrapper } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { applyLensInlineEditorAndWaitClosed, test, testData } from '../fixtures';

const DASHBOARD_ID = 'esql-legacy-slot-self-heal-dashboard';
const PANEL_INDEX = 'esql-legacy-slot-panel';
const ADHOC_DATA_VIEW_ID = 'esql-legacy-slot-adhoc-logstash';
const LAYER_ID = 'layer-esql-legacy-slot';

// authoritative per-layer query of the legacy document
const LAYER_QUERY = 'FROM logstash-* | STATS count = COUNT(*)';
// diverged, stale aggregate copy in the legacy `state.query` slot — dead data
const STALE_SLOT_QUERY = `${LAYER_QUERY} | LIMIT 999`;
// query typed during the edit step
const UPDATED_QUERY = `${LAYER_QUERY} | LIMIT 5`;

/**
 * Legacy dual-written by-value ES|QL Lens attributes: the ES|QL query is
 * persisted on the text-based layer (authoritative) AND as an aggregate copy
 * in `state.query` (legacy slot). The slot copy is intentionally diverged to
 * prove the layer query wins on load and the stale copy is gone after save.
 *
 * By-value on a dashboard is the migration-critical shape: no UI flow creates
 * by-ref ES|QL charts, and ES|QL editing is inline-flyout only.
 */
const getLegacyDualWrittenAttributes = () => ({
  title: '',
  visualizationType: 'lnsDatatable',
  references: [],
  state: {
    query: { esql: STALE_SLOT_QUERY },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          [LAYER_ID]: {
            index: ADHOC_DATA_VIEW_ID,
            query: { esql: LAYER_QUERY },
            columns: [
              {
                columnId: 'count',
                fieldName: 'count',
                label: 'count',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
            ],
            timeField: '@timestamp',
          },
        },
        indexPatternRefs: [
          { id: ADHOC_DATA_VIEW_ID, title: 'logstash-*', timeField: '@timestamp' },
        ],
      },
    },
    visualization: {
      layerId: LAYER_ID,
      layerType: 'data',
      columns: [{ columnId: 'count' }],
    },
    adHocDataViews: {
      [ADHOC_DATA_VIEW_ID]: {
        id: ADHOC_DATA_VIEW_ID,
        title: 'logstash-*',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'logstash-*',
        allowHidden: false,
        managed: false,
      },
    },
    internalReferences: [],
  },
});

const getDashboardAttributes = () => ({
  title: 'esql legacy slot self-heal',
  description: '',
  timeRestore: false,
  optionsJSON: JSON.stringify({
    useMargins: true,
    syncColors: false,
    syncCursor: true,
    syncTooltips: false,
    hidePanelTitles: false,
  }),
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({ query: { query: '', language: 'kuery' }, filter: [] }),
  },
  panelsJSON: JSON.stringify([
    {
      type: 'lens',
      gridData: { x: 0, y: 0, w: 24, h: 15, i: PANEL_INDEX },
      panelIndex: PANEL_INDEX,
      embeddableConfig: {
        attributes: getLegacyDualWrittenAttributes(),
        enhancements: {},
      },
    },
  ]),
});

test.describe(
  'Lens legacy dual-written ES|QL slot self-heal (by-value inline editing)',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ esArchiver, kbnClient, uiSettings }) => {
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LOGSTASH);
      await kbnClient.savedObjects.create({
        type: 'dashboard',
        id: DASHBOARD_ID,
        overwrite: true,
        attributes: getDashboardAttributes(),
      });
      await uiSettings.set({
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient, uiSettings }) => {
      await uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
      await kbnClient.savedObjects.cleanStandardList();
    });

    test('renders the layer query, self-heals the stale slot on save, and survives re-open', async ({
      pageObjects,
      page,
      kbnClient,
    }) => {
      const { dashboard, lens } = pageObjects;
      const codeEditor = new KibanaCodeEditorWrapper(page);

      await test.step('open the dashboard: legacy by-value panel renders', async () => {
        await dashboard.openDashboardWithIdInEditMode(DASHBOARD_ID);
        await dashboard.waitForRenderComplete();
      });

      await test.step('inline flyout seeds from the layer query, not the stale slot', async () => {
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
        await expect.poll(() => codeEditor.getCodeEditorValue()).toBe(LAYER_QUERY);
      });

      await test.step('edit the query, apply, and save the dashboard', async () => {
        await codeEditor.setCodeEditorValue(UPDATED_QUERY);
        const runButton = page.testSubj.locator('ESQLEditor-run-query-button');
        await expect(runButton).toBeEnabled();
        await runButton.click();
        await dashboard.waitForRenderComplete();
        await applyLensInlineEditorAndWaitClosed({ lens });
        // the applied edit reaches the dashboard's unsaved-changes state
        // asynchronously; quick-saving earlier snapshots the pre-edit panel.
        // In edit mode the dirty marker is the save button's notification dot.
        const unsavedDot = page.testSubj.locator('split-button-notification-indicator');
        await expect(unsavedDot).toBeVisible();
        await dashboard.clickQuickSave();
        await expect(unsavedDot).toBeHidden();
      });

      await test.step('full page reload: flyout seeds from the saved layer query', async () => {
        // the dashboard backup service restores unsaved panel state from
        // sessionStorage on reload — clear it (and localStorage) so the
        // flyout content can only come from the persisted saved object
        await page.evaluate(() => {
          window.sessionStorage.clear();
          window.localStorage.clear();
        });
        await page.reload();
        await dashboard.waitForRenderComplete();
        // clearing storage also dropped the view-mode backup — the dashboard
        // reloads in view mode, so re-enter edit mode for the panel action
        await dashboard.ensureEditMode();
        await dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await codeEditor.waitCodeEditorReady('InlineEditingESQLEditor');
        await expect.poll(() => codeEditor.getCodeEditorValue()).toBe(UPDATED_QUERY);
      });

      await test.step('persisted panel: stale slot copy did not survive the save', async () => {
        const { attributes } = await kbnClient.savedObjects.get<{ panelsJSON: string }>({
          type: 'dashboard',
          id: DASHBOARD_ID,
        });
        // the stale aggregate copy must never survive a save
        expect(attributes.panelsJSON).not.toContain(STALE_SLOT_QUERY);

        // two-outcome contract for the persisted slot: absent (slot removed,
        // or panel stored in API format without a slot) or a refreshed mirror
        // of the authoritative layer query (mixed-version compat write, see
        // `withLegacyAggregateQuerySlot`) — never anything else
        const [panel] = JSON.parse(attributes.panelsJSON) as Array<{
          embeddableConfig?: { attributes?: { state?: { query?: { esql?: unknown } } } };
        }>;
        const slotEsql = panel?.embeddableConfig?.attributes?.state?.query?.esql;
        expect([undefined, UPDATED_QUERY]).toContain(slotEsql);
      });
    });
  }
);
