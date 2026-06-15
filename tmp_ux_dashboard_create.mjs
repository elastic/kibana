import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:5603/nrv';
const OUT = join(process.cwd(), 'tmp_ux_screenshots');
mkdirSync(OUT, { recursive: true });

const notes = [];

function log(step, detail) {
  notes.push({ step, detail, at: new Date().toISOString() });
  console.log(`[${step}] ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

try {
  log('1-login', `Opening ${BASE}`);
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 120000 });

  const username = page.locator('[data-test-subj="loginUsername"]');
  if (await username.count()) {
    await username.fill('elastic');
    await page.locator('[data-test-subj="loginPassword"]').fill('changeme');
    await page.locator('[data-test-subj="loginSubmit"]').click();
    await page.waitForLoadState('networkidle', { timeout: 120000 });
    log('1-login', 'Submitted elastic/changeme');
  } else {
    log('1-login', 'No login form found (maybe already authenticated or security off)');
  }

  await page.screenshot({ path: join(OUT, '01-after-login.png'), fullPage: true });

  log('2-nav', 'Going to Dashboards listing');
  await page.goto(`${BASE}/app/dashboards`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, '02-dashboard-listing.png'), fullPage: true });

  const createBtn = page.locator('[data-test-subj="newItemButton"]');
  const createBtnAlt = page.getByRole('button', { name: /create dashboard/i });
  const createCount = (await createBtn.count()) + (await createBtnAlt.count());
  log('2-nav', `Create button candidates found: ${createCount}`);

  if (await createBtn.count()) {
    await createBtn.first().click();
  } else if (await createBtnAlt.count()) {
    await createBtnAlt.first().click();
  } else {
    log('2-nav', 'ERROR: Could not find Create dashboard button');
  }

  await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '03-new-dashboard.png'), fullPage: true });

  const url = page.url();
  log('3-create', `Landed on URL: ${url}`);

  const emptyEdit = page.locator('[data-test-subj="emptyDashboardWidget"]');
  const emptyView = page.locator('[data-test-subj="dashboardEmptyReadWrite"]');
  const emptyReadonly = page.locator('[data-test-subj="dashboardEmptyReadOnly"]');
  const tweakpane = page.locator('[data-test-subj="dashboardLayoutTweakpane"]');
  const addPanel = page.locator('[data-test-subj="dashboardAddNewPanelButton"]');
  const saveBtn = page.locator('[data-test-subj="dashboardSaveMenuItem"]');
  const editToggle = page.getByRole('button', { name: /edit dashboard/i });

  log('3-create', `emptyDashboardWidget: ${await emptyEdit.count()}`);
  log('3-create', `dashboardEmptyReadWrite: ${await emptyView.count()}`);
  log('3-create', `dashboardEmptyReadOnly: ${await emptyReadonly.count()}`);
  log('3-create', `Tweakpane visible: ${await tweakpane.count()}`);
  log('3-create', `Add panel button: ${await addPanel.count()}`);
  log('3-create', `Save menu item: ${await saveBtn.count()}`);
  log('3-create', `Edit dashboard button: ${await editToggle.count()}`);

  if (await emptyView.count()) {
    log('4-mode', 'Empty dashboard opened in VIEW mode — extra click needed to edit');
    await editToggle.first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, '04-after-edit-click.png'), fullPage: true });
  }

  const titleInput = page.locator('[data-test-subj="dashboardTitle"], #dashboardTitle');
  log('4-title', `Title elements: ${await titleInput.count()}`);

  const unsavedBadge = page.locator('[data-test-subj="dashboardUnsavedChangesBadge"]');
  log('4-unsaved', `Unsaved changes badge: ${await unsavedBadge.count()}`);

  // Try opening add panel flyout if available
  if (await addPanel.count()) {
    await addPanel.first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, '05-add-panel-flyout.png'), fullPage: true });
    log('5-add-panel', 'Opened add panel flyout');
    await page.keyboard.press('Escape');
  }

  // Scroll tweakpane area if present
  if (await tweakpane.count()) {
    log('6-tweakpane', 'Layout Tweakpane is visible on empty dashboard (dev overlay)');
  }

  writeFileSync(join(OUT, 'notes.json'), JSON.stringify(notes, null, 2));
  log('done', `Screenshots saved to ${OUT}`);
} catch (err) {
  log('error', String(err));
  await page.screenshot({ path: join(OUT, 'error.png'), fullPage: true }).catch(() => {});
  writeFileSync(join(OUT, 'notes.json'), JSON.stringify(notes, null, 2));
  throw err;
} finally {
  await browser.close();
}
