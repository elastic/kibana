/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Phase 2 exit-criterion proof: boots the headless client worker against a *real, running*
 * Kibana dev server (not Jest, not a stub HTTP server) and navigates it to a real saved
 * `lnsXY` dashboard's reporting redirect URL, exactly the way `pngServer`/`printablePdfServer`
 * would for a live report. No per-type service reconstruction: the worker fetches the real
 * optimizer bundle Kibana already serves and runs it.
 *
 * Prerequisites (left running by the operator, not started by this script):
 *   - `node scripts/es snapshot --license trial` (Elasticsearch on :9200)
 *   - `node scripts/kibana --dev --no-base-path` (Kibana on :5601)
 *   - A saved dashboard with at least one `lnsXY` panel, reachable with basic auth.
 *
 * Run with:
 *   KIBANA_URL=http://localhost:5601 DASHBOARD_ID=<id> \
 *     node --disallow-code-generation-from-strings \
 *     x-pack/platform/packages/private/reporting-server-render/scripts/verify_real_dashboard_boot.js
 */

require('@kbn/setup-node-env');

// `@kbn/setup-node-env` (`src/setup_node_env/exit_on_warning.js`) installs its own
// `process.on('unhandledRejection', ...)` that unconditionally `process.exit(1)`s -- sane
// for Kibana's own dev/build tooling (fail fast on a real bug), but wrong here: a real
// browser tolerates one navigated page's own async script throwing an unhandled rejection
// (it's just a devtools console error, not a crashed tab), and the real worker thread this
// prototypes must survive one broken panel's script error without taking down every other
// concurrent report job in the same process. Replace it with our own non-fatal handler
// instead of also depending on this script's own `process.on('unhandledRejection', ...)`
// below running first (`EventEmitter` calls every registered listener, in registration
// order, not just one).
process.removeAllListeners('unhandledRejection');

const { performance } = require('perf_hooks');

const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
const DASHBOARD_ID = process.env.DASHBOARD_ID;
const BASIC_AUTH = Buffer.from('elastic:changeme').toString('base64');
// Verbose per-fetch/per-script tracing was invaluable for root-causing each boot blocker,
// but is too noisy to leave on by default; set DEBUG=1 to get it back.
const DEBUG = Boolean(process.env.DEBUG);

if (!DASHBOARD_ID) {
  // eslint-disable-next-line no-console
  console.error('FAILED: set DASHBOARD_ID to a saved dashboard id');
  process.exit(1);
}

// A navigated real app can reject a promise asynchronously, outside any try/catch this
// script controls (e.g. a chunk loader's own `async function` callback) -- surface it as a
// diagnostic instead of letting Node's default `--unhandled-rejections=throw` kill the
// whole worker process over one broken panel.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('process unhandledRejection:', reason);
});

const main = async () => {
  // `@kbn/setup-node-env` above registers `@kbn/babel-register`, which lets `require`
  // resolve `.ts` source directly (same pattern as `verify_selector_engine_under_flag.js`).
  const { LoopbackHttpClient } = require('../src/services/loopback_http_client');
  const { createHeadlessDomEnvironment } = require('../src/worker/headless_dom_environment');
  const {
    injectScreenshotContextScript,
    installScreenshotContextBridge,
    installDynamicScriptRunner,
    runDocumentScripts,
    waitForRenderComplete,
  } = require('../src/worker/navigate_and_wait');

  const client = new LoopbackHttpClient({
    baseUrl: KIBANA_URL,
    forwardedHeaders: { authorization: `Basic ${BASIC_AUTH}` },
  });

  const redirectUrl = client.resolveUrl('/app/reportingRedirect');

  const locatorParams = {
    id: 'DASHBOARD_APP_LOCATOR',
    version: '9.6.0',
    params: {
      dashboardId: DASHBOARD_ID,
      preserveSavedFilters: true,
      viewMode: 'view',
    },
  };

  const bootStart = performance.now();
  const heapBefore = process.memoryUsage().heapUsed;

  // eslint-disable-next-line no-console
  console.log(`Fetching ${redirectUrl} ...`);
  const response = await client.fetch('/app/reportingRedirect');
  // eslint-disable-next-line no-console
  console.log(
    `redirect app fetch: status=${response.status} redirected=${response.redirected} url=${response.url}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch redirect app: ${response.status} ${await response.text()}`);
  }
  const rawHtml = await response.text();
  // eslint-disable-next-line no-console
  console.log(`has kbn-csp tag: ${rawHtml.includes('<kbn-csp')}`);

  const html = injectScreenshotContextScript(rawHtml, {
    __REPORTING_REDIRECT_LOCATOR_STORE_KEY__: locatorParams,
  });

  const env = createHeadlessDomEnvironment({
    loopbackHttpClient: client,
    url: redirectUrl,
    html,
  });

  installScreenshotContextBridge(env);

  if (DEBUG) {
    // Diagnostics: log every fetch the bundle makes against Kibana, since a failing API call
    // (e.g. missing capabilities/ui_settings) could silently prevent the app from mounting.
    const originalFetch = env.window.fetch.bind(env.window);
    env.window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      // eslint-disable-next-line no-console
      console.log(`fetch ${args[0]} -> ${response.status}`);
      return response;
    };

    const originalInsertBefore = env.document.head.insertBefore.bind(env.document.head);
    env.document.head.insertBefore = (node, ref) => {
      // eslint-disable-next-line no-console
      console.log(`head.insertBefore: ${node.tagName} src/href=${node.src || node.href}`);
      return originalInsertBefore(node, ref);
    };
  }

  // Surfaces anything a real browser's devtools console would show, since uncaught async
  // errors inside the bundle (as opposed to synchronous script-eval errors) would otherwise
  // fail silently here.
  env.window.addEventListener('error', (event) => {
    // eslint-disable-next-line no-console
    console.error('window error event:', event.message, event.error?.stack || '');
  });
  env.window.addEventListener('unhandledrejection', (event) => {
    // eslint-disable-next-line no-console
    console.error('unhandledrejection:', event.reason?.stack || event.reason);
  });

  // eslint-disable-next-line no-console
  console.log('Running real optimizer bundles in jsdom ...');
  const dynamicRunner = installDynamicScriptRunner(env, env.usageLog);
  dynamicRunner.firstError.catch((error) => {
    // eslint-disable-next-line no-console
    console.error('dynamic script error:', error);
  });
  await runDocumentScripts(env, env.usageLog);

  // eslint-disable-next-line no-console
  console.log('Waiting for renderComplete ...');
  let renderErrors;
  try {
    ({ renderErrors } = await waitForRenderComplete(env.document, { timeoutMs: 60_000 }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`document.readyState=${env.document.readyState}`);
    // eslint-disable-next-line no-console
    console.log(`body innerHTML length=${env.document.body.innerHTML.length}`);
    // eslint-disable-next-line no-console
    console.log(`body innerHTML snippet: ${env.document.body.innerHTML.slice(0, 4000)}`);
    // eslint-disable-next-line no-console
    console.log(`shim usage log: ${JSON.stringify(env.usageLog.getEntries())}`);
    throw error;
  }

  const bootEnd = performance.now();
  const heapAfter = process.memoryUsage().heapUsed;

  const itemsCount = env.document.querySelectorAll('[data-shared-item]').length;

  // eslint-disable-next-line no-console
  console.log(
    `OK: dashboard ${DASHBOARD_ID} reached renderComplete with ${itemsCount} shared item(s), ` +
      `${renderErrors.length} render error(s), in ${(bootEnd - bootStart).toFixed(0)}ms, ` +
      `heap delta ${((heapAfter - heapBefore) / 1024 / 1024).toFixed(1)}MB. ` +
      `Shim usage: ${JSON.stringify(env.usageLog.getEntries())}`
  );

  if (renderErrors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Render errors:', renderErrors);
    process.exitCode = 1;
  }

  dynamicRunner.dispose();
  env.dispose();
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('FAILED:', error);
  process.exit(1);
});
