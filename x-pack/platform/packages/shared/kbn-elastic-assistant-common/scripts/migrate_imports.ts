/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Codemod: migrate @kbn/elastic-assistant-common imports in client-side or server-side files
 *
 * CLIENT MODE (default):
 *   - Schema types (from gen files) → import type { X } from '@kbn/elastic-assistant-common/types/<path>'
 *   - Constants → import { X } from '@kbn/elastic-assistant-common/constants'
 *   - Root utils (functions etc.) → keep import { X } from '@kbn/elastic-assistant-common'
 *   - /impl/schemas barrel imports → import type { X } from '@kbn/elastic-assistant-common/types'
 *
 * SERVER MODE (--server):
 *   - Schema names (Zod objects) → import { X } from '@kbn/elastic-assistant-common/impl/schemas/<path>.gen'
 *   - Constants → import { X } from '@kbn/elastic-assistant-common/constants'
 *   - Root utils → keep import { X } from '@kbn/elastic-assistant-common'
 *   - /impl/schemas barrel imports → rewrite each name to its specific deep impl/schemas/<path>.gen path
 *
 * Run with:
 *   node -r @kbn/setup-node-env x-pack/platform/packages/shared/kbn-elastic-assistant-common/scripts/migrate_imports.ts [--target <glob>...] [--dry-run] [--server]
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
const serverMode = args.includes('--server');
const targetGlobs: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--target' && args[i + 1]) {
    targetGlobs.push(args[i + 1]);
    i++;
  }
}

if (targetGlobs.length === 0) {
  if (serverMode) {
    targetGlobs.push(
      'x-pack/solutions/security/plugins/elastic_assistant/server/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/security_solution/server/**/*.{ts,tsx}'
    );
  } else {
    targetGlobs.push(
      'x-pack/solutions/security/plugins/security_solution/public/**/*.{ts,tsx}',
      'x-pack/solutions/security/plugins/elastic_assistant/public/**/*.{ts,tsx}'
    );
  }
}

console.log(`Mode: ${serverMode ? 'server' : 'client'}`);

// ---------------------------------------------------------------------------
// Step 1: Build name → deep types path map from impl/schemas/**/*.gen.ts
// ---------------------------------------------------------------------------

const schemasDir = path.join(PKG_ROOT, 'impl/schemas');
const typesDir = path.join(PKG_ROOT, 'types');

// Map: exportedName → '@kbn/elastic-assistant-common/types/<rel>'
const nameToTypesPath = new Map<string, string>();

// Map: exportedName → '@kbn/elastic-assistant-common/impl/schemas/<rel-no-ext>'
const nameToSchemasPath = new Map<string, string>();

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
  const schemasImportPath = `@kbn/elastic-assistant-common/impl/schemas/${relNoExt}`;

  const content = fs.readFileSync(genFilePath, 'utf-8');
  const exportedNames = getExportedNamesFromContent(content);
  for (const name of exportedNames) {
    if (!nameToTypesPath.has(name)) {
      nameToTypesPath.set(name, typesImportPath);
    }
    if (!nameToSchemasPath.has(name)) {
      nameToSchemasPath.set(name, schemasImportPath);
    }
  }
}

// Also scan types/ gen files directly (for client mode nameToTypesPath only)
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
console.log(`Built name→schemas-path map with ${nameToSchemasPath.size} entries.`);

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

function classifyClient(name: string): Classification {
  if (KEEP_ON_ROOT_BARREL.has(name)) return 'rootUtil';
  if (nameToTypesPath.has(name)) return 'schemaType';
  if (constantsSet.has(name)) return 'constant';
  return 'rootUtil';
}

function classifyServer(name: string): Classification {
  if (KEEP_ON_ROOT_BARREL.has(name)) return 'rootUtil';
  if (nameToSchemasPath.has(name)) return 'schemaType';
  if (constantsSet.has(name)) return 'constant';
  return 'rootUtil';
}

function classify(name: string): Classification {
  return serverMode ? classifyServer(name) : classifyClient(name);
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
 *
 * Two-pass approach to handle multiple import declarations that may share the same destination:
 *   Pass 1 — collect all names from ALL matching imports, group by destination path.
 *   Pass 2 — replace ALL matched import declarations: first one gets the consolidated statements,
 *             subsequent ones from the same "source category" get replaced with empty string.
 */
function processFileText(fileText: string): string | null {
  const project = new Project({ skipAddingFilesFromTsConfig: true, useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile('target.ts', fileText);

  // Identify all import declarations that need rewriting
  const targetImportDecls = sourceFile.getImportDeclarations().filter((decl) => {
    const spec = decl.getModuleSpecifierValue();
    return (
      spec === '@kbn/elastic-assistant-common' ||
      spec === '@kbn/elastic-assistant-common/impl/schemas' ||
      spec === '@kbn/elastic-assistant-common/impl/schemas/index'
    );
  });

  if (targetImportDecls.length === 0) return null;

  // --- Pass 1: collect all names → destination key mappings ---
  // Key format:
  //   client mode: 'type:<path>', 'constant:<path>', 'util:@kbn/elastic-assistant-common'
  //   server mode: 'schemas:<path>', 'constant:<path>', 'util:@kbn/elastic-assistant-common'
  //
  // We also need to detect if any root-barrel import was "type-only" to preserve that
  // for util names. Track util type-only separately.

  // In server mode for impl/schemas barrel: always emit regular imports for schema names
  // (Zod objects can be used as runtime values even if they're also used as types).

  const consolidatedGroups = new Map<string, Array<{ name: string; alias: string | undefined }>>();
  let hasUtilTypeOnly = true; // becomes false if any root barrel util is in a regular import
  let needsChange = false;

  // Track which declarations are truly "only util" (no migration needed)
  // If ALL root barrel decls only have util names, no change needed.
  const affectedDecls: Array<{
    decl: (typeof targetImportDecls)[0];
    hasNonUtil: boolean;
  }> = [];

  for (const importDecl of targetImportDecls) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    const isImplSchemas =
      moduleSpecifier === '@kbn/elastic-assistant-common/impl/schemas' ||
      moduleSpecifier === '@kbn/elastic-assistant-common/impl/schemas/index';
    const originalIsTypeOnly = importDecl.isTypeOnly();
    const namedImports = importDecl.getNamedImports();
    if (namedImports.length === 0) continue;

    let hasNonUtil = false;

    for (const ni of namedImports) {
      const name = ni.getName();
      const alias = ni.getAliasNode()?.getText();

      let key: string;

      if (isImplSchemas) {
        // impl/schemas barrel
        if (serverMode) {
          if (KEEP_ON_ROOT_BARREL.has(name)) {
            key = 'util:@kbn/elastic-assistant-common';
          } else if (nameToSchemasPath.has(name)) {
            key = `schemas:${nameToSchemasPath.get(name)!}`;
            hasNonUtil = true;
          } else if (constantsSet.has(name)) {
            key = 'constant:@kbn/elastic-assistant-common/constants';
            hasNonUtil = true;
          } else {
            key = 'util:@kbn/elastic-assistant-common';
          }
        } else {
          // client mode: all go to types barrel
          key = 'type:@kbn/elastic-assistant-common/types';
          hasNonUtil = true;
        }
      } else {
        // root barrel
        const cls = classify(name);
        if (cls === 'schemaType') {
          if (serverMode) {
            key = `schemas:${nameToSchemasPath.get(name)!}`;
          } else {
            key = `type:${nameToTypesPath.get(name)!}`;
          }
          hasNonUtil = true;
        } else if (cls === 'constant') {
          key = 'constant:@kbn/elastic-assistant-common/constants';
          hasNonUtil = true;
        } else {
          key = 'util:@kbn/elastic-assistant-common';
          if (!originalIsTypeOnly) hasUtilTypeOnly = false;
        }
      }

      if (!consolidatedGroups.has(key)) consolidatedGroups.set(key, []);
      // Avoid duplicate names (same name from two separate imports)
      const existing = consolidatedGroups.get(key)!;
      if (!existing.some((e) => e.name === name && e.alias === alias)) {
        existing.push({ name, alias });
      }
    }

    if (hasNonUtil) needsChange = true;
    affectedDecls.push({ decl: importDecl, hasNonUtil });
  }

  // If nothing needs migration (all root util), skip
  if (!needsChange) return null;

  // Also mark as needing change if any impl/schemas barrel is present
  const hasImplSchemas = targetImportDecls.some(
    (d) =>
      d.getModuleSpecifierValue() === '@kbn/elastic-assistant-common/impl/schemas' ||
      d.getModuleSpecifierValue() === '@kbn/elastic-assistant-common/impl/schemas/index'
  );
  if (!needsChange && !hasImplSchemas) return null;

  // --- Pass 2: build consolidated replacement text ---

  const replacementLines: string[] = [];
  for (const [key, items] of consolidatedGroups) {
    if (key.startsWith('type:')) {
      const modulePath = key.slice(5);
      replacementLines.push(buildImportStatement(true, modulePath, items));
    } else if (key.startsWith('schemas:')) {
      const modulePath = key.slice(8);
      // Server mode: schema names are Zod runtime objects — regular import (not type-only)
      // so they can be used as both TypeScript types and runtime values.
      replacementLines.push(buildImportStatement(false, modulePath, items));
    } else if (key.startsWith('constant:')) {
      const modulePath = key.slice(9);
      replacementLines.push(buildImportStatement(false, modulePath, items));
    } else {
      // util – keep on root barrel, preserve type-only if all util imports were type-only
      replacementLines.push(
        buildImportStatement(hasUtilTypeOnly, '@kbn/elastic-assistant-common', items)
      );
    }
  }

  const consolidatedText = replacementLines.join('\n');

  // --- Pass 3: apply replacements ---
  // Replace ALL matching import declarations, but only put the consolidated text at the FIRST one.
  // Subsequent ones get empty string. Sort by start position descending.

  const sortedDecls = [...targetImportDecls].sort((a, b) => b.getStart() - a.getStart());

  // Determine the first (earliest in file) matching decl
  const firstDeclStart = Math.min(...targetImportDecls.map((d) => d.getStart()));

  const posReplacements: Array<{ start: number; end: number; text: string }> = [];
  for (const decl of sortedDecls) {
    const start = decl.getStart();
    const end = decl.getEnd();
    if (start === firstDeclStart) {
      posReplacements.push({ start, end, text: consolidatedText });
    } else {
      // Remove the declaration entirely (replace with empty string)
      // Also consume the trailing newline if present
      posReplacements.push({ start, end, text: '' });
    }
  }

  // Remove empty-string replacements that leave blank lines
  // We handle this by including the trailing newline in the end position
  const posReplacementsWithNewline: Array<{ start: number; end: number; text: string }> = [];
  for (const rep of posReplacements) {
    if (rep.text === '') {
      // Extend end to include trailing newline
      let endPos = rep.end;
      if (fileText[endPos] === '\n') endPos++;
      posReplacementsWithNewline.push({ start: rep.start, end: endPos, text: '' });
    } else {
      posReplacementsWithNewline.push(rep);
    }
  }

  // Apply in reverse position order
  posReplacementsWithNewline.sort((a, b) => b.start - a.start);
  let result = fileText;
  for (const { start, end, text } of posReplacementsWithNewline) {
    result = result.slice(0, start) + text + result.slice(end);
  }

  return result === fileText ? null : result;
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
