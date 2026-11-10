/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

// Draws a Lens ES|QL chart to a PNG through a running Kibana's in-process PNG host
// (POST /internal/isomer/render/png). Needs the sample web logs and `isomer.materializeEnabled`.
//
//   node x-pack/platform/plugins/shared/isomer/scripts/render_png.js --example metric --out metric.png
//   node x-pack/platform/plugins/shared/isomer/scripts/render_png.js --config lens.json --scheme dark
//
// Options: --kibana (default http://localhost:5601), --auth (default elastic:changeme),
// --example metric|xy|xy-time, --config <Lens API config JSON file>, --out <file>,
// --scheme light|dark, --scale 1|2, --width <px>, --from/--to (default now-7d/now).

const Fs = require('fs');
const Path = require('path');

const FIXTURES = Path.resolve(
  __dirname,
  '../../../../packages/shared/isomer/isomer-gate-a/fixtures'
);

const fixtureConfig = (name) =>
  JSON.parse(Fs.readFileSync(Path.join(FIXTURES, `${name}.json`), 'utf8')).config;

const EXAMPLES = {
  // [Logs] Web Traffic's "Unique Visitors" metric, with its color bands.
  metric: () => fixtureConfig('sample-logs__11'),
  // [Logs] Web Traffic's "Bytes distribution" area chart.
  xy: () => fixtureConfig('sample-logs__cbca842c-b9fa-4523-9ce0-14e350866e33'),
  // Requests per hour by machine OS, stacked bars over time.
  'xy-time': () => ({
    type: 'xy',
    title: 'Requests per hour by OS',
    legend: { visibility: 'auto', placement: 'outside', position: 'right' },
    layers: [
      {
        type: 'bar_stacked',
        data_source: {
          type: 'esql',
          query:
            'FROM kibana_sample_data_logs | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS requests = COUNT(*) BY hour = BUCKET(@timestamp, 1 hour), os = machine.os.keyword',
        },
        x: { column: 'hour' },
        y: [{ column: 'requests' }],
        breakdown_by: { column: 'os' },
      },
    ],
  }),
};

const args = process.argv.slice(2).reduce((parsed, arg, index, all) => {
  if (arg.startsWith('--')) {
    parsed[arg.slice(2)] =
      all[index + 1] && !all[index + 1].startsWith('--') ? all[index + 1] : true;
  }
  return parsed;
}, {});

const main = async () => {
  const kibana = (args.kibana || 'http://localhost:5601').replace(/\/$/, '');
  const config = args.config
    ? JSON.parse(Fs.readFileSync(args.config, 'utf8'))
    : EXAMPLES[args.example || 'metric']?.();
  if (!config) {
    throw new Error(`Unknown example "${args.example}". Try ${Object.keys(EXAMPLES).join(', ')}.`);
  }
  const image = {
    ...(args.scheme ? { scheme: args.scheme } : {}),
    ...(args.scale ? { scale: Number(args.scale) } : {}),
    ...(args.width ? { width: Number(args.width) } : {}),
  };
  const started = Date.now();
  const response = await fetch(`${kibana}/internal/isomer/render/png`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(args.auth || 'elastic:changeme').toString('base64')}`,
      'content-type': 'application/json',
      'elastic-api-version': '1',
      'kbn-xsrf': 'isomer-render-png',
      'x-elastic-internal-origin': 'kibana',
    },
    body: JSON.stringify({
      input: { type: 'lens', config },
      context: { time_range: { from: args.from || 'now-7d', to: args.to || 'now' } },
      image,
    }),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  const png = Buffer.from(await response.arrayBuffer());
  const out = args.out || `${args.example || 'chart'}.png`;
  Fs.writeFileSync(out, png);
  console.log(
    `Wrote ${out}: ${png.byteLength} bytes, ${response.headers.get('x-isomer-image-size')}, ` +
      `${response.headers.get('x-isomer-node-type')} node, drawn in ` +
      `${response.headers.get('x-isomer-render-ms')} ms (${Date.now() - started} ms round trip)`
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
