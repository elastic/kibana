/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Codemod: migrate @kbn/elastic-assistant-common imports in client-side files
 *
 * For each file in the target directories:
 *   - Schema types (from gen files) → import type { X } from '@kbn/elastic-assistant-common/types/<path>'
 *   - Constants → import { X } from '@kbn/elastic-assistant-common/constants'
 *   - Root utils (functions etc.) → keep import { X } from '@kbn/elastic-assistant-common'
 *   - /impl/schemas barrel imports → import type { X } from '@kbn/elastic-assistant-common/types'
 *
 * Run with:
 *   node -r @kbn/setup-node-env x-pack/platform/packages/shared/kbn-elastic-assistant-common/scripts/migrate_imports.ts [--target <glob>...] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { Project } from 'ts-morph';
import globby from 'globby';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const PKG_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetGlobs: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && args[i + 1]) {
    targetGlobs.push(args[i + 1]);
    i++;
  }
}

if (targetGlobs.length === 0) {
  targetGlobs.push(
    'x-pack/solutions/security/plugins/security_solution/public/**/*.{ts,tsx}',
    'x-pack/solutions/security/plugins/elastic_assistant/public/**/*.{ts,tsx}'
  );
}

// ---------------------------------------------------------------------------
// Step 1: Build name → deep types path map from impl/schemas/**/*.gen.ts
// ---------------------------------------------------------------------------

const schemasDir = path.join(PKG_ROOT, 'impl/schemas');
const typesDir = path.join(PKG_ROOT, 'types');

// Map: exportedName → '@kbn/elastic-assistant-common/types/<rel>'
const nameToTypesPath = new Map<string, string>();

function getExportedNamesFromContent(content: string): string[] {
  const names: string[] = [];

  // Match: export type Foo = ..., export interface Foo, export const Foo, export enum Foo, export function Foo
  const directExportPattern =
    /^export\s+(?:(?:type|interface|class|enum|const|function|abstract\s+class)\s+)([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let match: RegExpExecArray | null;
  while ((match = directExportPattern.exec(content)) !== null) {
    const name = match[1].trim();
    if (name) names.push(name);
  }

  // Match re-export: export { Foo, Bar as Baz } from '...'
  // or export { Foo, Bar }
  const reExportPattern = /^export\s*\{([^}]+)\}(?:\s*from\s*['"][^'"]+['"])?;/gm;
  while ((match = reExportPattern.exec(content)) !== null) {
    const items = match[1].split(',');
    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed || trimmed.startsWith('*')) continue;
      // Handle "Foo as Bar" - the exported name is Bar
      const asMatch = trimmed.match(/\S+\s+as\s+(\S+)/);
      if (asMatch) {
        names.push(asMatch[1]);
      } else {
        names.push(trimmed.split(/\s+/)[0]);
      }
    }
  }

  return [...new Set(names)].filter(Boolean);
}

// Scan all gen files in impl/schemas (skip overrides.gen_overrides.ts)
const genFiles = globby.sync('**/*.gen.ts', {
  cwd: schemasDir,
  absolute: true,
});

for (const genFilePath of genFiles) {
  const relFromSchemas = path.relative(schemasDir, genFilePath);
  // Strip .ts extension
  const relNoExt = relFromSchemas.replace(/\.ts$/, '');
  const typesImportPath = `@kbn/elastic-assistant-common/types/${relNoExt}`;

  const content = fs.readFileSync(genFilePath, 'utf-8');
  const exportedNames = getExportedNamesFromContent(content);
  for (const name of exportedNames) {
    if (!nameToTypesPath.has(name)) {
      nameToTypesPath.set(name, typesImportPath);
    }
  }
}

// Also scan types/ gen files directly
const typesFiles = globby.sync('**/*.gen.ts', {
  cwd: typesDir,
  absolute: true,
});

for (const typesFilePath of typesFiles) {
  const relFromTypes = path.relative(typesDir, typesFilePath);
  const relNoExt = relFromTypes.replace(/\.ts$/, '');
  const typesImportPath = `@kbn/elastic-assistant-common/types/${relNoExt}`;

  const content = fs.readFileSync(typesFilePath, 'utf-8');
  const exportedNames = getExportedNamesFromContent(content);
  for (const name of exportedNames) {
    if (!nameToTypesPath.has(name)) {
      nameToTypesPath.set(name, typesImportPath);
    }
  }
}

console.log(`Built name→types-path map with ${nameToTypesPath.size} entries.`);

// ---------------------------------------------------------------------------
// Step 2: Build constants set from constants.ts
// ---------------------------------------------------------------------------

const constantsFile = path.join(PKG_ROOT, 'constants.ts');
const constantsContent = fs.readFileSync(constantsFile, 'utf-8');
const constantsSet = new Set<string>();

const constNames = getExportedNamesFromContent(constantsContent);
for (const name of constNames) {
  constantsSet.add(name);
}

console.log(`Built constants set with ${constantsSet.size} entries.`);

// Names that come from impl/schemas/index.ts overrides file – keep on root barrel
const KEEP_ON_ROOT_BARREL = new Set([
  'CreateKnowledgeBaseRequestParams',
  'ReadKnowledgeBaseRequestParams',
]);

// ---------------------------------------------------------------------------
// Step 3: Classify a single imported name
// ---------------------------------------------------------------------------

type Classification = 'schemaType' | 'constant' | 'rootUtil';

function classify(name: string): Classification {
  if (KEEP_ON_ROOT_BARREL.has(name)) return 'rootUtil';
  if (nameToTypesPath.has(name)) return 'schemaType';
  if (constantsSet.has(name)) return 'constant';
  return 'rootUtil';
}

// ---------------------------------------------------------------------------
// Step 4: Process target files
// ---------------------------------------------------------------------------

function buildImportStatement(
  isTypeOnly: boolean,
  modulePath: string,
  names: Array<{ name: string; alias: string | undefined }>
): string {
  const typeKeyword = isTypeOnly ? 'type ' : '';
  const namedList = names
    .map(({ name, alias }) => (alias ? `${name} as ${alias}` : name))
    .join(', ');
  return `import ${typeKeyword}{ ${namedList} } from '${modulePath}';`;
}

/**
 * Process a single file's text content and return rewritten text (or null if no changes).
 */
function processFileText(fileText: string): string | null {
  const project = new Project({ skipAddingFilesFromTsConfig: true, useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('target.ts', fileText);

  let modified = false;

  // We process imports in reverse order so positions don't shift
  const importDecls = sourceFile.getImportDeclarations();

  // Collect replacements: { start, end, replacement }
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (const importDecl of importDecls) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    if (
      moduleSpecifier !== '@kbn/elastic-assistant-common' &&
      moduleSpecifier !== '@kbn/elastic-assistant-common/impl/schemas' &&
      moduleSpecifier !== '@kbn/elastic-assistant-common/impl/schemas/index'
    ) {
      continue;
    }

    const isImplSchemas =
      moduleSpecifier === '@kbn/elastic-assistant-common/impl/schemas' ||
      moduleSpecifier === '@kbn/elastic-assistant-common/impl/schemas/index';

    const namedImports = importDecl.getNamedImports();
    if (namedImports.length === 0) continue;

    const start = importDecl.getStart();
    const end = importDecl.getEnd();

    if (isImplSchemas) {
      // All names → types barrel
      const names = namedImports.map((ni) => ({
        name: ni.getName(),
        alias: ni.getAliasNode()?.getText(),
      }));
      const replacement = buildImportStatement(true, '@kbn/elastic-assistant-common/types', names);
      replacements.push({ start, end, text: replacement });
      modified = true;
      continue;
    }

    // Root barrel: classify each name
    // Group by destination module
    const groups = new Map<string, Array<{ name: string; alias: string | undefined }>>();
    // Track whether original import was type-only
    const originalIsTypeOnly = importDecl.isTypeOnly();

    for (const ni of namedImports) {
      const name = ni.getName();
      const alias = ni.getAliasNode()?.getText();
      const cls = classify(name);

      let key: string;
      if (cls === 'schemaType') {
        const typesPath = nameToTypesPath.get(name)!;
        key = `type:${typesPath}`;
      } else if (cls === 'constant') {
        key = 'constant:@kbn/elastic-assistant-common/constants';
      } else {
        key = 'util:@kbn/elastic-assistant-common';
      }

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ name, alias });
    }

    // Check if nothing actually changes (all rootUtil, same module)
    if (groups.size === 1 && groups.has('util:@kbn/elastic-assistant-common')) {
      continue;
    }

    const replacementLines: string[] = [];
    for (const [key, items] of groups) {
      if (key.startsWith('type:')) {
        const modulePath = key.slice(5);
        replacementLines.push(buildImportStatement(true, modulePath, items));
      } else if (key.startsWith('constant:')) {
        const modulePath = key.slice(9);
        replacementLines.push(buildImportStatement(false, modulePath, items));
      } else {
        // util – keep on root barrel
        replacementLines.push(
          buildImportStatement(originalIsTypeOnly, '@kbn/elastic-assistant-common', items)
        );
      }
    }

    replacements.push({ start, end, text: replacementLines.join('\n') });
    modified = true;
  }

  if (!modified || replacements.length === 0) return null;

  // Apply replacements in reverse order (to preserve positions)
  replacements.sort((a, b) => b.start - a.start);
  let result = fileText;
  for (const { start, end, text } of replacements) {
    result = result.slice(0, start) + text + result.slice(end);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

const allTargetFiles = globby.sync(targetGlobs, { cwd: REPO_ROOT, absolute: true });
console.log(`Found ${allTargetFiles.length} target files to process.`);

let filesModified = 0;
let statementsRewritten = 0;

for (const filePath of allTargetFiles) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const rewritten = processFileText(original);

  if (rewritten !== null) {
    filesModified++;
    // Count statements: count number of replacements (approximation via diff)
    statementsRewritten++;

    if (dryRun) {
      console.log(`  [dry-run] Would modify: ${path.relative(REPO_ROOT, filePath)}`);
    } else {
      fs.writeFileSync(filePath, rewritten, 'utf-8');
    }
  }
}

console.log(
  `\nSummary: ${filesModified} files modified, ${statementsRewritten} import groups rewritten.`
);
