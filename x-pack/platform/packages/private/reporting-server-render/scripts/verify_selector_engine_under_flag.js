/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Proves the `jsdom_selector_compat` shim (see `src/worker/jsdom_selector_compat.ts`)
 * actually closes the nwsapi/`new Function` gap under Kibana's packaged
 * `--disallow-code-generation-from-strings` flag, outside Jest (same reason as
 * `verify_packaged_kibana_constraint.js`: Jest's own tooling uses `new Function`).
 *
 * Checks, in order:
 *   1. `document.baseURI` -- jsdom's own internal `<base>`-tag lookup (the require-cache
 *      half of the shim).
 *   2. `document.querySelectorAll('.a span[data-test-subj]')` -- an application-level
 *      selector call (the css-select-backed prototype patch half of the shim).
 *   3. Loading and executing a real built Kibana bundle via `vm.runInContext`, to confirm
 *      neither half of the shim leaves a gap a real bundle would hit.
 *
 * Run directly with:
 *
 *   node --disallow-code-generation-from-strings \
 *     x-pack/platform/packages/private/reporting-server-render/scripts/verify_selector_engine_under_flag.js
 */

require('@kbn/setup-node-env');

// Order matters: `jsdom_selector_compat` must be required before `jsdom` itself (see that
// module's doc comment). `@kbn/setup-node-env` above registers `@kbn/babel-register`, which
// lets `require` resolve the `.ts` source directly.
const { installSelectorEngine } = require('../src/worker/jsdom_selector_compat');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
  '<!doctype html><html><head><base href="http://localhost:5601/"></head>' +
    '<body><div class="a"><span data-test-subj="hi">hi</span></div></body></html>',
  { url: 'http://localhost:5601/bundles/', pretendToBeVisual: true }
);
installSelectorEngine(dom.window);

const failures = [];

try {
  // The shim deliberately ignores any `<base href>` element and resolves to the document's
  // own URL (Kibana never injects `<base href>`); the point of this check is that the
  // getter doesn't throw under the flag, not that it honors `<base>`.
  const baseURI = dom.window.document.baseURI;
  if (baseURI !== 'http://localhost:5601/bundles/') {
    failures.push(`document.baseURI returned ${baseURI}, expected http://localhost:5601/bundles/`);
  }
} catch (e) {
  failures.push(`document.baseURI threw: ${e.message}`);
}

try {
  const found = dom.window.document.querySelectorAll('.a span[data-test-subj]');
  if (found.length !== 1 || found[0].textContent !== 'hi') {
    failures.push(`querySelectorAll returned unexpected result: ${JSON.stringify(found)}`);
  }
} catch (e) {
  failures.push(`querySelectorAll threw: ${e.message}`);
}

const fs = require('fs');
const path = require('path');
const bundlePath = path.join(__dirname, '../../../../../../target/public/bundles/kibana.bundle.js');
if (fs.existsSync(bundlePath)) {
  const vm = require('vm');
  const vmDom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost:5601/bundles/',
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  installSelectorEngine(vmDom.window);
  Object.defineProperty(vmDom.window.document, 'currentScript', {
    value: { tagName: 'SCRIPT', src: 'http://localhost:5601/bundles/kibana.bundle.js' },
    configurable: true,
  });
  try {
    vm.runInContext(fs.readFileSync(bundlePath, 'utf8'), vmDom.getInternalVMContext(), {
      filename: 'kibana.bundle.js',
    });
  } catch (e) {
    // Only fail on the error class this shim is meant to prevent; other errors (e.g. a
    // missing DLL-reference bundle that was never loaded) are out of scope for this check.
    if (e instanceof EvalError || /code generation from strings/i.test(e.message)) {
      failures.push(`real bundle hit a code-generation error: ${e.message}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`(real bundle threw an unrelated, expected error: ${e.message})`);
    }
  }
} else {
  // eslint-disable-next-line no-console
  console.log(`(skipping real-bundle check: ${bundlePath} not found)`);
}

if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error('FAILED:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(
  `OK: selector-engine shim works under the flag (flag active: ${
    process.execArgv.includes('--disallow-code-generation-from-strings') ||
    (process.env.NODE_OPTIONS || '').includes('--disallow-code-generation-from-strings')
  })`
);
