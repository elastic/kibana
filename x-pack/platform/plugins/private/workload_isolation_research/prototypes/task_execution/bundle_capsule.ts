/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'esbuild';

const dependencyRoot = '/Users/jloleysens/repos/work/kibana';
const dependencies = createRequire(join(dependencyRoot, 'package.json'));
const { build } = dependencies('esbuild') as typeof import('esbuild');
const { generate } = dependencies('peggy') as typeof import('peggy');
const entry = fileURLToPath(new URL('../task_capsule/capsule_kernel.ts', import.meta.url));
const output = fileURLToPath(new URL('../task_capsule/target/capsule_kernel.cjs', import.meta.url));
const staticImports = process.env.WIR_CAPSULE_STATIC_IMPORTS === '1';
const resolveKbnModule = (specifier: string): string => {
  try {
    return dependencies.resolve(specifier);
  } catch {
    const base = join(dependencyRoot, 'node_modules', specifier);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      join(base, 'index.ts'),
      join(base, 'index.tsx'),
    ];
    const found = candidates.find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile()
    );
    if (!found) throw new Error(`No allowlisted Kibana source entry for ${specifier}`);
    return found;
  }
};
const capsuleModules: Plugin = {
  name: 'research_capsule_modules',
  setup(builder) {
    builder.onResolve({ filter: /^@kbn\// }, ({ path }) => ({ path: resolveKbnModule(path) }));
    builder.onResolve({ filter: /^[^./]/ }, ({ path }) => ({ path, external: true }));
    builder.onLoad({ filter: /\.peggy$/ }, ({ path }) => {
      const configPath = `${path}.config.json`;
      const config = existsSync(configPath)
        ? (JSON.parse(readFileSync(configPath, 'utf8')) as {
            allowedStartRules?: string[];
            cache?: boolean;
          })
        : {};
      return {
        contents: generate(readFileSync(path, 'utf8'), {
          ...config,
          output: 'source',
          format: 'commonjs',
        }),
        loader: 'js',
        resolveDir: dirname(path),
      };
    });
    builder.onLoad({ filter: /capsule_kernel\.ts$/ }, ({ path }) => {
      const original = readFileSync(path, 'utf8');
      const imports: string[] = [];
      const body = staticImports
        ? original.replace(
            /const\s+\{([^}]+)\}\s*=\s*dependencies\(\s*'([^']+)'\s*\)\s*as\s*typeof\s*import\('[^']+'\);/g,
            (_match: string, names: string, specifier: string) => {
              imports.push(`import { ${names} } from '${specifier}';`);
              return '';
            }
          )
        : original.replaceAll('dependencies(', 'require(');
      if (staticImports) assert.equal(imports.length, 6, 'Bootstrap import shape changed');
      return {
        contents: [...imports, body].join('\n'),
        loader: 'ts',
        resolveDir: dirname(path),
      };
    });
  },
};
const result = await build({
  entryPoints: [entry],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  metafile: true,
  tsconfig: join(dependencyRoot, 'tsconfig.base.json'),
  plugins: [capsuleModules],
  logLevel: 'warning',
});
process.stdout.write(
  JSON.stringify({
    output,
    bytes: statSync(output).size,
    linkage: staticImports ? 'static_named_imports' : 'namespace_requires',
    source_modules: Object.keys(result.metafile?.inputs ?? {}).length,
    note: 'distribution_shaped_standalone_kernel_NOT_Kibana_image_or_Node_source_build',
  }) + '\n'
);
