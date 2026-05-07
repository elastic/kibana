/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

const REPOS = [
  { owner: 'open-telemetry', repo: 'opentelemetry-collector', label: 'core' },
  { owner: 'open-telemetry', repo: 'opentelemetry-collector-contrib', label: 'contrib' },
];

const COMPONENT_CLASSES = ['receiver', 'processor', 'exporter', 'connector'];
const CONCURRENCY = 20;
const OUTPUT_PATH = path.resolve(
  __dirname,
  '../../public/components/otel_ui/collector_config_view/component_detail/component_doc_links.generated.ts'
);

const LICENSE_HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */`;

interface GitTreeEntry {
  path: string;
  type: string;
}

interface ComponentEntry {
  key: string;
  url: string;
  displayName?: string;
  repo: string;
}

const httpsGet = (url: string, headers: Record<string, string> = {}): Promise<string> =>
  new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'generate-otel-component-doc-links',
        ...headers,
      },
    };
    https
      .get(url, opts, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpsGet(res.headers.location, headers).then(resolve, reject);
        }
        if (res.statusCode && res.statusCode >= 400) {
          let body = '';
          res.on('data', (c: string) => (body += c));
          res.on('end', () =>
            reject(new Error(`HTTP ${res.statusCode} for ${url}: ${body.slice(0, 200)}`))
          );
          return;
        }
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });

const githubHeaders = (): Record<string, string> => {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    return { Authorization: `token ${token}` };
  }
  return {};
};

const getMetadataPaths = async (
  owner: string,
  repo: string
): Promise<Array<{ componentClass: string; dirName: string; path: string }>> => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`;
  console.log(`  Fetching tree for ${owner}/${repo} ...`);
  const raw = await httpsGet(url, githubHeaders());
  const tree = JSON.parse(raw);
  if (!tree.tree) {
    throw new Error(`Unexpected response from ${url}: ${raw.slice(0, 200)}`);
  }

  const re = new RegExp(`^(${COMPONENT_CLASSES.join('|')})/([^/]+)/metadata\\.yaml$`);

  const results: Array<{ componentClass: string; dirName: string; path: string }> = [];
  for (const entry of tree.tree as GitTreeEntry[]) {
    const m = entry.path.match(re);
    if (!m) continue;
    const componentClass = m[1];
    const dirName = m[2];

    if (!dirName.endsWith(componentClass)) continue;

    results.push({ componentClass, dirName, path: entry.path });
  }

  return results;
};

const fetchMetadata = async (
  owner: string,
  repo: string,
  filePath: string
): Promise<{ typeName: string; displayName?: string } | null> => {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
  const content = await httpsGet(url, githubHeaders());

  const typeMatch = content.match(/^type:\s*(.+)$/m);
  if (!typeMatch) return null;
  const typeName = typeMatch[1].trim();

  const displayMatch = content.match(/^display_name:\s*(.+)$/m);
  const displayName = displayMatch ? displayMatch[1].trim() : undefined;

  return { typeName, displayName };
};

const parallelMap = async <T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> => {
  const results: R[] = [];
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  };

  const workers = [];
  for (let w = 0; w < Math.min(concurrency, items.length); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
};

export const run = async () => {
  const entries: ComponentEntry[] = [];

  for (const { owner, repo, label } of REPOS) {
    const metaPaths = await getMetadataPaths(owner, repo);
    console.log(`  Found ${metaPaths.length} component metadata files in ${repo}`);

    const results = await parallelMap(
      metaPaths,
      async ({ componentClass, dirName, path: filePath }) => {
        try {
          const meta = await fetchMetadata(owner, repo, filePath);
          if (!meta) {
            console.warn(`    WARN: no type: field in ${filePath}`);
            return null;
          }
          const readmeUrl = `https://github.com/${owner}/${repo}/blob/main/${componentClass}/${dirName}/README.md`;
          return {
            key: `${componentClass}:${meta.typeName}`,
            url: readmeUrl,
            displayName: meta.displayName,
            repo: label,
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`    WARN: failed to fetch ${filePath}: ${message}`);
          return null;
        }
      },
      CONCURRENCY
    );

    for (const r of results) {
      if (r) entries.push(r);
    }
  }

  entries.sort((a, b) => a.key.localeCompare(b.key));

  console.log(`\n  Total components: ${entries.length}`);

  const lines = [
    LICENSE_HEADER,
    '',
    '// Auto-generated by scripts/generate_otel_component_doc_links',
    '// Do not edit manually. Re-run: node scripts/generate_otel_component_doc_links/index.js',
    '//',
    `// Generated: ${new Date().toISOString()}`,
    `// Components: ${entries.length}`,
    '',
    'export interface ComponentDocLink {',
    '  url: string;',
    '  displayName?: string;',
    "  repo: 'core' | 'contrib';",
    '}',
    '',
    'const COMPONENT_DOC_LINKS: Record<string, ComponentDocLink> = {',
  ];

  for (const e of entries) {
    lines.push(`  '${e.key}': {`);
    lines.push(`    url: '${e.url}',`);
    if (e.displayName) {
      lines.push(`    displayName: '${e.displayName.replace(/'/g, "\\'")}',`);
    }
    lines.push(`    repo: '${e.repo}',`);
    lines.push('  },');
  }

  lines.push('};');
  lines.push('');
  lines.push('');
  lines.push('// Aliases for components whose upstream type name differs from the');
  lines.push('// name commonly used in OTel Collector configs.');
  lines.push('const ALIASES: Record<string, string> = {');
  lines.push("  'exporter:otlp': 'exporter:otlp_grpc',");
  lines.push("  'exporter:otlphttp': 'exporter:otlp_http',");
  lines.push('};');
  lines.push('');
  lines.push('export const getComponentDocUrl = (');
  lines.push('  type: string,');
  lines.push('  name: string');
  lines.push('): ComponentDocLink | null => {');
  lines.push("  const baseName = name.split('/')[0];");
  lines.push('  const key = `${type}:${baseName}`;');
  lines.push("  return COMPONENT_DOC_LINKS[key] ?? COMPONENT_DOC_LINKS[ALIASES[key] ?? ''] ?? null;");
  lines.push('};');
  lines.push('');

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf8');
  console.log(`  Written to ${OUTPUT_PATH}`);
};
