/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dev-only probe: renders one tiny document per (CSS declaration) through the real Takumi
 * backend and prints which values it accepts or rejects. Takumi fails the whole render on a
 * known property with a value it can't parse, so `src/lowering/takumi_css.ts`'s whitelist
 * and rejected-value table are derived from this. Rerun on every Takumi upgrade.
 *
 *   node x-pack/platform/packages/private/reporting-server-render/scripts/probe_takumi_css.js [--json]
 */
require('@kbn/setup-node-env');

const { createTakumiImageBackend } = require('@elastic/isomer-image-takumi');

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// [label, css declarations applied to the probe element]
const DECLARATIONS = [
  ['overflow: auto', 'overflow:auto'],
  ['overflow: scroll', 'overflow:scroll'],
  ['overflow: hidden', 'overflow:hidden'],
  ['overflow: clip', 'overflow:clip'],
  ['overflow: visible', 'overflow:visible'],
  ['overflow-x: auto', 'overflow-x:auto'],
  ['overflow-y: scroll', 'overflow-y:scroll'],
  ['display: -webkit-box', 'display:-webkit-box'],
  ['display: flex', 'display:flex'],
  ['display: inline-flex', 'display:inline-flex'],
  ['display: inline-grid', 'display:inline-grid'],
  ['display: grid', 'display:grid'],
  ['display: contents', 'display:contents'],
  ['display: inline', 'display:inline'],
  ['display: inline-block', 'display:inline-block'],
  ['display: table', 'display:table'],
  ['position: sticky', 'position:sticky'],
  ['position: fixed', 'position:fixed'],
  ['position: absolute', 'position:absolute'],
  ['width: fit-content', 'width:fit-content'],
  ['width: min-content', 'width:min-content'],
  ['width: -webkit-fill-available', 'width:-webkit-fill-available'],
  ['width: calc(100% - 8px)', 'width:calc(100% - 8px)'],
  ['width: 100%', 'width:100%'],
  ['min-width: fit-content', 'min-width:fit-content'],
  ['max-width: fit-content', 'max-width:fit-content'],
  ['height: auto', 'height:auto'],
  ['inline-size: 10px', 'inline-size:10px'],
  ['block-size: 10px', 'block-size:10px'],
  ['margin-inline: 4px', 'margin-inline:4px'],
  ['padding-block: 4px 8px', 'padding-block:4px 8px'],
  ['inset-inline-start: 2px', 'inset-inline-start:2px;position:absolute'],
  ['margin: 0 auto', 'margin:0 auto'],
  [
    'grid-template-columns: repeat(1, minmax(0, 1fr))',
    'display:grid;grid-template-columns:repeat(1, minmax(0, 1fr))',
  ],
  ['grid-template-columns: 1fr 2fr', 'display:grid;grid-template-columns:1fr 2fr'],
  ['grid-template-rows: auto', 'display:grid;grid-template-rows:auto'],
  ['grid-template-rows: min-content auto', 'display:grid;grid-template-rows:min-content auto'],
  ['grid-template-rows: minmax(80px, 1fr)', 'display:grid;grid-template-rows:minmax(80px, 1fr)'],
  ['grid-column: 1 / -1', 'grid-column:1 / -1'],
  ['grid-row: 2', 'grid-row:2'],
  ['flex: 1 1 auto', 'display:flex;flex:1 1 auto'],
  ['flex: 1 !important', 'display:flex;flex:1 !important'],
  ['flex-wrap: wrap', 'display:flex;flex-wrap:wrap'],
  ['align-self: auto', 'align-self:auto'],
  ['align-items: center', 'display:flex;align-items:center'],
  ['justify-content: space-between', 'display:flex;justify-content:space-between'],
  ['gap: 4px 8px', 'display:flex;gap:4px 8px'],
  ['color: inherit', 'color:inherit'],
  ['color: currentColor', 'color:currentColor'],
  ['color: transparent', 'color:transparent'],
  ['color: rgb(1 2 3 / 50%)', 'color:rgb(1 2 3 / 50%)'],
  ['color: #12345678', 'color:#12345678'],
  ['color: var(--x, red)', 'color:var(--x, red)'],
  ['color: var(--undefined)', 'color:var(--undefinedvar)'],
  ['font-weight: 600', 'font-weight:600'],
  ['font-family: Inter, sans-serif', 'font-family:Inter, sans-serif'],
  ['font-family: "Elastic UI Numeric", Inter', 'font-family:"Elastic UI Numeric", Inter'],
  ['font-size: 1rem', 'font-size:1rem'],
  ['font-size: 0.875rem', 'font-size:0.875rem'],
  ['font-size: 1em', 'font-size:1em'],
  ['font-variant-numeric: tabular-nums', 'font-variant-numeric:tabular-nums'],
  ['font-feature-settings: "tnum"', 'font-feature-settings:"tnum"'],
  ['font-kerning: normal', 'font-kerning:normal'],
  ['line-height: 1.5', 'line-height:1.5'],
  ['line-height: 24px', 'line-height:24px'],
  ['letter-spacing: -0.02em', 'letter-spacing:-0.02em'],
  ['text-align: start', 'text-align:start'],
  ['text-align: right', 'text-align:right'],
  ['text-decoration: underline', 'text-decoration:underline'],
  ['text-transform: uppercase', 'text-transform:uppercase'],
  ['text-overflow: ellipsis', 'text-overflow:ellipsis;overflow:hidden;white-space:nowrap'],
  ['white-space: pre-line', 'white-space:pre-line'],
  ['white-space: break-spaces', 'white-space:break-spaces'],
  ['white-space: nowrap', 'white-space:nowrap'],
  ['word-break: break-word', 'word-break:break-word'],
  ['overflow-wrap: anywhere', 'overflow-wrap:anywhere'],
  ['overflow-wrap: break-word', 'overflow-wrap:break-word'],
  ['line-clamp: 2', 'line-clamp:2'],
  ['-webkit-line-clamp: 2', '-webkit-line-clamp:2'],
  ['-webkit-box-orient: vertical', '-webkit-box-orient:vertical'],
  ['-webkit-font-smoothing: antialiased', '-webkit-font-smoothing:antialiased'],
  ['opacity: 0.5', 'opacity:0.5'],
  ['visibility: hidden', 'visibility:hidden'],
  ['z-index: 2', 'position:relative;z-index:2'],
  ['background: #fff', 'background:#fff'],
  [
    'background: linear-gradient(90deg, #fff, #000)',
    'background:linear-gradient(90deg, #fff, #000)',
  ],
  ['background-color: rgba(0,0,0,.1)', 'background-color:rgba(0,0,0,.1)'],
  ['background-image: url(data)', `background-image:url(${PIXEL})`],
  ['background-size: cover', `background-image:url(${PIXEL});background-size:cover`],
  ['border: 1px solid #ccc', 'border:1px solid #ccc'],
  ['border: none', 'border:none'],
  ['border: 0', 'border:0'],
  ['border-width: 0 0 1px', 'border-width:0 0 1px;border-style:solid'],
  ['border-style: dashed', 'border:1px dashed #ccc'],
  ['border-bottom: 1px solid', 'border-bottom:1px solid'],
  ['border-inline-start: 1px solid #ccc', 'border-inline-start:1px solid #ccc'],
  ['border-radius: 4px', 'border-radius:4px'],
  ['border-radius: 50%', 'border-radius:50%'],
  ['border-collapse: collapse', 'border-collapse:collapse'],
  ['box-shadow: 0 1px 2px rgba(0,0,0,.2)', 'box-shadow:0 1px 2px rgba(0,0,0,.2)'],
  ['box-shadow: inset 0 0 0 1px #ccc', 'box-shadow:inset 0 0 0 1px #ccc'],
  ['box-sizing: border-box', 'box-sizing:border-box'],
  ['outline: 1px solid red', 'outline:1px solid red'],
  ['transform: translateX(4px)', 'transform:translateX(4px)'],
  ['transform: matrix(1,0,0,1,0,0)', 'transform:matrix(1,0,0,1,0,0)'],
  ['transform: scale(1.5)', 'transform:scale(1.5)'],
  ['transform-origin: 0 0', 'transform-origin:0 0'],
  ['transition: all 1s', 'transition:all 1s'],
  ['animation: x 1s', 'animation:x 1s'],
  ['cursor: pointer', 'cursor:pointer'],
  ['pointer-events: none', 'pointer-events:none'],
  ['user-select: none', 'user-select:none'],
  ['will-change: transform', 'will-change:transform'],
  ['filter: blur(1px)', 'filter:blur(1px)'],
  ['object-fit: contain', 'object-fit:contain'],
  ['vertical-align: middle', 'vertical-align:middle'],
  ['list-style: none', 'list-style:none'],
  ['appearance: none', 'appearance:none'],
  ['content: "x"', 'content:"x"'],
  ['direction: ltr', 'direction:ltr'],
  ['--custom: 4px', '--custom:4px;width:var(--custom)'],
  ['all: unset', 'all:unset'],
  ['contain: layout', 'contain:layout'],
  ['clip-path: circle(50%)', 'clip-path:circle(50%)'],
  ['mask-image: none', 'mask-image:none'],
  ['inset: 0', 'position:absolute;inset:0'],
  ['top: 0', 'position:absolute;top:0'],
  ['aspect-ratio: 1 / 1', 'aspect-ratio:1 / 1'],
  ['table-layout: fixed', 'display:table;table-layout:fixed'],
];

// Structural probes, each a full html + css pair.
const STRUCTURAL = [
  [
    '<img> under overflow: hidden',
    `<div style="overflow:hidden;width:50px;height:50px"><img src="${PIXEL}" width="50" height="50"></div>`,
    '',
  ],
  [
    '<img> under overflow: clip',
    `<div style="overflow:clip;width:50px;height:50px"><img src="${PIXEL}" width="50" height="50"></div>`,
    '',
  ],
  [
    '<img> under overflow: visible',
    `<div style="overflow:visible;width:50px;height:50px"><img src="${PIXEL}" width="50" height="50"></div>`,
    '',
  ],
  [
    '<svg> inline',
    '<svg width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" fill="red"/></svg>',
    '',
  ],
  [
    '<table> markup',
    '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
    '',
  ],
  ['<button>', '<button>x</button>', ''],
  ['<h2>/<p>/<ul>', '<h2>t</h2><p>p</p><ul><li>l</li></ul>', ''],
  ['<a href>', '<a href="https://x.test">x</a>', ''],
  ['<figure>/<figcaption>', '<figure><figcaption>c</figcaption></figure>', ''],
  ['stylesheet: :root var', '<div class="a">x</div>', ':root{--x:red}.a{color:var(--x)}'],
  ['stylesheet: @media screen', '<div class="a">x</div>', '@media screen{.a{color:red}}'],
  [
    'stylesheet: @media (min-width: 100px)',
    '<div class="a">x</div>',
    '@media (min-width:100px){.a{color:red}}',
  ],
  ['stylesheet: @media print', '<div class="a">x</div>', '@media print{.a{color:red}}'],
  [
    'stylesheet: @media (hover: hover)',
    '<div class="a">x</div>',
    '@media (hover:hover){.a{color:red}}',
  ],
  [
    'stylesheet: @font-face',
    '<div class="a">x</div>',
    '@font-face{font-family:X;src:url(x.woff2)}.a{color:red}',
  ],
  [
    'stylesheet: @keyframes',
    '<div class="a">x</div>',
    '@keyframes k{from{opacity:0}to{opacity:1}}.a{color:red}',
  ],
  ['stylesheet: @layer', '<div class="a">x</div>', '@layer base{.a{color:red}}'],
  ['stylesheet: @supports', '<div class="a">x</div>', '@supports (display:grid){.a{color:red}}'],
  ['stylesheet: :hover', '<div class="a">x</div>', '.a:hover{color:red}'],
  ['stylesheet: :focus-visible', '<div class="a">x</div>', '.a:focus-visible{color:red}'],
  ['stylesheet: :has()', '<div class="a"><b>x</b></div>', '.a:has(b){color:red}'],
  ['stylesheet: ::placeholder', '<div class="a">x</div>', '.a::placeholder{color:red}'],
  ['stylesheet: ::-webkit-scrollbar', '<div class="a">x</div>', '.a::-webkit-scrollbar{width:0}'],
  ['stylesheet: ::before content', '<div class="a">x</div>', '.a::before{content:"> "}'],
  ['stylesheet: :not(.b)', '<div class="a">x</div>', '.a:not(.b){color:red}'],
  ['stylesheet: [data-x="y"]', '<div class="a" data-x="y">x</div>', '[data-x="y"]{color:red}'],
  ['stylesheet: *', '<div class="a">x</div>', '*{box-sizing:border-box}'],
  ['stylesheet: html,body', '<div class="a">x</div>', 'html,body{margin:0}'],
  ['stylesheet: comma list w/ :hover', '<div class="a">x</div>', '.a,.b:hover{color:red}'],
  ['stylesheet: unknown property', '<div class="a">x</div>', '.a{frobnicate:1;color:red}'],
  [
    'stylesheet: unknown at-rule',
    '<div class="a">x</div>',
    '@frobnicate x{.a{color:red}}.a{color:blue}',
  ],
  ['stylesheet: nested & rule', '<div class="a"><b>x</b></div>', '.a{color:red;& b{color:blue}}'],
  [
    'stylesheet: unbalanced paren',
    '<div class="a">x</div>',
    '.a{display:grid;grid-template-columns:repeat(1, minmax(0, 1fr)}',
  ],
  [
    'stylesheet: !important',
    '<div class="a" style="color:blue">x</div>',
    '.a{color:red !important}',
  ],
  ['text: private-use glyph', '<div>\u{10C02}</div>', ''],
  ['text: CJK', '<div>漢字</div>', ''],
  ['text: arrow ↦', '<div>a↦b</div>', ''],
  ['text: emoji', '<div>\u{1F600}</div>', ''],
  ['text: nbsp / zero-width', '<div>a b​c</div>', ''],
];

const render = async (backend, html, css) => {
  await backend.png({ html, css, width: 120, height: 80 });
};

const main = async () => {
  const backend = createTakumiImageBackend();
  const results = [];
  for (const [label, decl] of DECLARATIONS) {
    // Stylesheet form (`css`) and inline form (`style="..."`): Takumi's tolerance differs.
    for (const form of ['stylesheet', 'inline']) {
      try {
        if (form === 'stylesheet') {
          await render(
            backend,
            '<div class="p" style="width:40px;height:20px">x</div>',
            `.p{${decl}}`
          );
        } else {
          await render(backend, `<div style="width:40px;height:20px;${decl}">x</div>`, '');
        }
        results.push({ label: `${form}: ${label}`, ok: true });
      } catch (error) {
        results.push({
          label: `${form}: ${label}`,
          ok: false,
          error: String(error.message || error)
            .split('\n')[0]
            .slice(0, 160),
        });
      }
    }
  }
  for (const [label, html, css] of STRUCTURAL) {
    try {
      await render(backend, html, css);
      results.push({ label, ok: true });
    } catch (error) {
      results.push({
        label,
        ok: false,
        error: String(error.message || error)
          .split('\n')[0]
          .slice(0, 160),
      });
    }
  }

  // Does an <img> under overflow actually draw? Compare non-white pixel counts.
  const { createCanvas, loadImage } = require('@napi-rs/canvas');
  const red = 'data:image/png;base64,' + createCanvas(20, 20).getContext('2d').constructor.name; // placeholder to keep the require used; real check below
  void red;
  const solid = (() => {
    const c = createCanvas(30, 30);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 30, 30);
    return `data:image/png;base64,${c.toBuffer('image/png').toString('base64')}`;
  })();
  const nonWhite = async (png) => {
    const img = await loadImage(png);
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) n++;
    return n;
  };
  for (const overflow of ['visible', 'hidden', 'clip', 'auto']) {
    // The same check with `overflow` coming from a matched stylesheet rule, not inline.
    try {
      const png = await backend.png({
        html: `<div class="o"><img src="${solid}" width="30" height="30"></div>`,
        css: `.o{overflow:${overflow};width:60px;height:60px}`,
        width: 60,
        height: 60,
      });
      const n = await nonWhite(png);
      results.push({
        label: `<img> DRAWS under stylesheet overflow:${overflow}`,
        ok: n > 100,
        detail: `${n} px`,
      });
    } catch (error) {
      results.push({
        label: `<img> DRAWS under stylesheet overflow:${overflow}`,
        ok: false,
        error: String(error.message).split('\n')[0].slice(0, 120),
      });
    }
    try {
      const png = await backend.png({
        html: `<div style="overflow:${overflow};width:60px;height:60px"><img src="${solid}" width="30" height="30"></div>`,
        css: '',
        width: 60,
        height: 60,
      });
      results.push({
        label: `<img> DRAWS under overflow:${overflow}`,
        ok: (await nonWhite(png)) > 100,
        detail: `${await nonWhite(png)} px`,
      });
    } catch (error) {
      results.push({
        label: `<img> DRAWS under overflow:${overflow}`,
        ok: false,
        error: String(error.message).split('\n')[0].slice(0, 120),
      });
    }
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      console.log(
        `${r.ok ? 'ok    ' : 'REJECT'}  ${r.label}${r.detail ? ` (${r.detail})` : ''}${
          r.ok ? '' : `  -> ${r.error}`
        }`
      );
    }
  }
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
