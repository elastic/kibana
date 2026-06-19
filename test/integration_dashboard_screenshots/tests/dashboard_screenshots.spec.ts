/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

interface DashboardInfo {
  id: string;
  title: string;
}

interface PackageDashboards {
  package: string;
  version: string;
  dashboards: DashboardInfo[];
}

const MANIFEST_PATH = path.resolve(__dirname, '..', 'dashboard_manifest.json');

const sanitizeFilename = (name: string, fallback?: string): string => {
  const sanitized = name
    .replace(/[[\]]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100);
  if (sanitized.length === 0 && fallback) {
    return sanitizeFilename(fallback);
  }
  return sanitized || 'untitled';
};

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const fetchManifestFromFleet = async (): Promise<PackageDashboards[]> => {
  const kibanaUrl = process.env.KIBANA_URL || 'http://localhost:5601';
  const user = process.env.ES_USER || 'elastic';
  const password = process.env.ES_PASSWORD || 'changeme';
  const auth = Buffer.from(`${user}:${password}`).toString('base64');

  const makeRequest = (reqPath: string): Promise<any> => {
    const normalizedBase = kibanaUrl.endsWith('/') ? kibanaUrl : `${kibanaUrl}/`;
    const normalizedPath = reqPath.startsWith('/') ? reqPath.slice(1) : reqPath;
    const url = new URL(normalizedPath, normalizedBase);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      lib
        .request(
          url,
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'kbn-xsrf': 'true',
              'elastic-api-version': '2023-10-31',
            },
            ...(isHttps ? { agent: httpsAgent } : {}),
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())));
          }
        )
        .on('error', reject)
        .end();
    });
  };

  const installedRes = await makeRequest('/api/fleet/epm/packages/installed');
  const packages: Array<{ name: string; version: string }> = (installedRes.items ?? []).map(
    (pkg: any) => ({ name: pkg.name, version: pkg.version })
  );

  const results: PackageDashboards[] = [];

  for (const { name, version } of packages) {
    const pkgRes = await makeRequest(`/api/fleet/epm/packages/${name}`);
    const installedKibana: Array<{ id: string; type: string }> =
      pkgRes.item?.installationInfo?.installed_kibana ?? [];
    const dashboardAssets = installedKibana.filter((a) => a.type === 'dashboard');

    if (dashboardAssets.length > 0) {
      results.push({
        package: name,
        version,
        dashboards: dashboardAssets.map((a) => ({ id: a.id, title: a.id })),
      });
    }
  }

  return results.sort((a, b) => a.package.localeCompare(b.package));
};

const loadManifest = (): PackageDashboards[] => {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }
  return [];
};

const waitForDashboardPanels = async (page: Page) => {
  await page
    .waitForSelector('[data-test-subj="dshDashboardViewport"]', { timeout: 60_000 })
    .catch(() => {});

  const expectedCount = await page
    .locator('[data-shared-items-count]')
    .first()
    .getAttribute('data-shared-items-count', { timeout: 10_000 })
    .then((v) => parseInt(v || '0', 10))
    .catch(() => 0);

  if (expectedCount > 0) {
    await page
      .waitForFunction(
        (count: number) => {
          const complete = document.querySelectorAll('[data-render-complete="true"]');
          const loading = document.querySelectorAll('[data-loading]');
          return complete.length >= count && loading.length === 0;
        },
        expectedCount,
        { timeout: 60_000, polling: 500 }
      )
      .catch(() => {});
  } else {
    await page
      .waitForFunction(
        () => {
          const panels = document.querySelectorAll('[data-render-complete]');
          if (panels.length === 0) return false;
          const loading = document.querySelectorAll('[data-loading]');
          return (
            loading.length === 0 &&
            Array.from(panels).every((p) => p.getAttribute('data-render-complete') === 'true')
          );
        },
        { timeout: 60_000, polling: 500 }
      )
      .catch(() => {});
  }

  await page.waitForTimeout(1500);

  await page
    .waitForFunction(
      () => {
        const lensPanels = document.querySelectorAll('[data-test-subj="lens-embeddable"]');
        return Array.from(lensPanels).every((panel) => !panel.querySelector('.euiLoadingChart'));
      },
      { timeout: 60_000, polling: 500 }
    )
    .catch(() => {});

  await page.waitForTimeout(1000);
};

const dismissBanners = async (page: Page) => {
  const dismissSelectors = [
    '[data-test-subj="skipWelcomeScreen"]',
    '[data-test-subj="dismissActionButton"]',
    '[data-test-subj="euiDismissCalloutButton"]',
    '.euiTour [data-test-subj="closeTourBtn"]',
  ];

  for (const selector of dismissSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click().catch(() => {});
    }
  }
};

const MAX_VIEWPORT_HEIGHT = 16_384;

const hideDashboardChrome = async (page: Page) => {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.setAttribute('data-test-hide-chrome', 'true');
    style.textContent = `
      header[data-test-subj="headerGlobalNav"],
      [data-test-subj="top-nav"],
      [data-test-subj="globalQueryBar"],
      .controlGroup,
      [data-test-subj="dashboardControls"],
      .euiGlobalToastList {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  });
  await page.waitForTimeout(300);
};

const hideNonLensPanels = async (page: Page) => {
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.setAttribute('data-test-hide-non-lens', 'true');
    style.textContent = `
      [data-test-subj="dashboardPanel"]:not(:has([data-test-subj="lens-embeddable"])) {
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
  });
  await page.waitForTimeout(300);
};

const expandViewport = async (page: Page) => {
  const contentHeight = await page.evaluate(() => {
    const container = document.querySelector('[data-shared-items-container]');
    if (!container) return document.documentElement.scrollHeight;
    const rect = container.getBoundingClientRect();
    return Math.ceil(rect.bottom + window.scrollY + 50);
  });
  const height = Math.min(MAX_VIEWPORT_HEIGHT, Math.max(1080, contentHeight));
  await page.setViewportSize({ width: 1920, height });
  await page.waitForTimeout(500);
};

const resetViewport = async (page: Page) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
};

const test = base.extend<object, { sharedContext: BrowserContext; sharedPage: Page }>({
  sharedContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext({
        baseURL: (process.env.KIBANA_URL || 'http://localhost:5601').replace(/\/?$/, '/'),
        ignoreHTTPSErrors: true,
        viewport: { width: 1920, height: 1080 },
      });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],
  sharedPage: [
    async ({ sharedContext }, use) => {
      const page = await sharedContext.newPage();
      const user = process.env.ES_USER || 'elastic';
      const password = process.env.ES_PASSWORD || 'changeme';

      try {
        await page.goto('login', { waitUntil: 'networkidle', timeout: 30_000 });
        await page.fill('[data-test-subj="loginUsername"]', user);
        await page.fill('[data-test-subj="loginPassword"]', password);
        await page.click('[data-test-subj="loginSubmit"]');
        await page.waitForURL(/\/app\//, { timeout: 10_000 });
      } catch (err) {
        const currentUrl = page.url();
        throw new Error(
          `Login failed for user "${user}" at ${currentUrl}. ` +
            `Ensure Kibana is running and credentials are correct.`
        );
      }

      await use(page);
      await page.close();
    },
    { scope: 'worker' },
  ],
});

const manifest = loadManifest();

const SKIP_DASHBOARDS = new Set<string>([]);

test.describe('Integration Dashboard Screenshots', () => {
  for (const pkg of manifest) {
    test.describe(pkg.package, () => {
      for (const dashboard of pkg.dashboards) {
        if (SKIP_DASHBOARDS.has(dashboard.title)) {
          test.skip(dashboard.title, () => {});
          continue;
        }
        test(dashboard.title, async ({ sharedPage }) => {
          const snapshotName = `${sanitizeFilename(dashboard.title, dashboard.id)}.png`;
          const timeRange = `_g=(time:(from:'2026-03-11T05:00:00.000Z',to:'2026-03-11T06:00:00.000Z'))`;

          await sharedPage.goto(`app/dashboards#/view/${dashboard.id}?${timeRange}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
          });

          const onLoginPage = await sharedPage
            .locator('[data-test-subj="loginSubmit"]')
            .isVisible({ timeout: 1_000 })
            .catch(() => false);
          if (onLoginPage) {
            const user = process.env.ES_USER || 'elastic';
            const password = process.env.ES_PASSWORD || 'changeme';
            try {
              await sharedPage.fill('[data-test-subj="loginUsername"]', user);
              await sharedPage.fill('[data-test-subj="loginPassword"]', password);
              await sharedPage.click('[data-test-subj="loginSubmit"]');
              await sharedPage.waitForURL(/\/app\//, { timeout: 10_000 });
            } catch (err) {
              throw new Error(
                `Session lost and re-login failed for dashboard "${dashboard.title}". ` +
                  `Original: ${(err as Error).message}`
              );
            }
            await sharedPage.goto(`app/dashboards#/view/${dashboard.id}?${timeRange}`, {
              waitUntil: 'domcontentloaded',
              timeout: 60_000,
            });
          }

          await dismissBanners(sharedPage);
          await waitForDashboardPanels(sharedPage);
          await hideDashboardChrome(sharedPage);
          await expandViewport(sharedPage);
          await waitForDashboardPanels(sharedPage);
          await hideNonLensPanels(sharedPage);
          await sharedPage.mouse.move(1910, 10);

          await expect(sharedPage).toHaveScreenshot([pkg.package, snapshotName], {
            fullPage: true,
          });

          await resetViewport(sharedPage);
        });
      }
    });
  }
});
