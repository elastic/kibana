/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import Fs from 'fs/promises';
import Path from 'path';
import { createWriteStream } from 'fs';
import { mkdtemp } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import type { Argv } from 'yargs';
import yargs from 'yargs';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import { createHash } from 'crypto';
import { connectorIdOption, elasticsearchOption, kibanaOption } from '../util/cli_options';
import { getServiceUrls } from '../util/get_service_urls';
import { KibanaClient } from '../util/kibana_client';
import { selectConnector } from '../util/select_connector';
import { rewriteFunctionPagePrompt } from './prompts';
import { bindOutput } from './utils/output_executor';
import { enrichDocumentation } from './enrich_documentation';

async function downloadFile(url: string, filePath: string): Promise<void> {
  const dirPath = Path.dirname(filePath);
  await Fs.mkdir(dirPath, { recursive: true });
  const writeStream = createWriteStream(filePath);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error('Response body is null');
  }

  await pipeline(res.body, writeStream);
}

function extractYamlCodeBlocks(content: string): string {
  // Match ```yaml ... ``` code blocks and everything after
  const yamlBlockRegex = /```yaml\n([\s\S]*?)```([\s\S]*)/;
  const match = content.match(yamlBlockRegex);

  if (!match) {
    return '';
  }

  const yamlContent = match[1]?.trim() || '';
  const contentAfterYaml = match[2]?.trim() || '';

  // Combine YAML content and everything after the YAML block
  let combined = '';
  if (yamlContent && contentAfterYaml) {
    combined = `${yamlContent}\n\n${contentAfterYaml}`;
  } else if (yamlContent) {
    combined = yamlContent;
  } else if (contentAfterYaml) {
    combined = contentAfterYaml;
  }

  // Remove the first 3 lines, which mark GA or Preview
  if (combined) {
    const lines = combined.split('\n');
    if (lines.length > 3) {
      return lines.slice(3).join('\n');
    } else {
      return '';
    }
  }

  return '';
}

function getCommandName(fileName: string): string {
  // Extract command name from filename (e.g., "match.md" -> "match")
  const baseName = Path.basename(fileName, '.md');
  return baseName;
}

interface FileCache {
  [sourceFilePath: string]: {
    hash: string; // Hash of entire source file (for quick check)
    sections?: {
      [outputFileName: string]: {
        hash: string; // Hash of the raw section content before processing
      };
    };
    outputFiles?: string[]; // Array of file names for mapping, no content needed
  };
}

/**
 * Normalize a file path to use only the path after /extracted for cache keys.
 * This ensures cache keys are stable across runs with different temporary directories.
 */
function normalizeCacheKey(filePath: string, extractDir: string): string {
  // Get the relative path from extractDir
  const relativePath = Path.relative(extractDir, filePath);
  // Normalize to use forward slashes (consistent across platforms)
  return relativePath.split(Path.sep).join('/');
}

async function loadCache(cachePath: string): Promise<FileCache> {
  try {
    const cacheContent = await Fs.readFile(cachePath, 'utf-8');
    return JSON.parse(cacheContent);
  } catch (error) {
    // Cache file doesn't exist or is invalid, return empty cache
    return {};
  }
}

async function saveCache(cachePath: string, cache: FileCache): Promise<void> {
  await Fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
/**
 * Rewrite the Syntax section to replace ![Embedded](...) with functionName(param1, param2, ...)
 * Extract parameter names from the Parameters section
 * @param content
 * @param functionName
 * @returns
 */
function rewriteSyntaxSection(content: string, functionName: string): string {
  const parameterRegex = /####\s+`([^`]+)`/g;
  const parameters: string[] = [];
  let paramMatch: RegExpExecArray | null;

  while ((paramMatch = parameterRegex.exec(content)) !== null) {
    parameters.push(paramMatch[1]);
  }

  // Build function signature
  const functionSignature =
    parameters.length > 0 ? `${functionName}(${parameters.join(', ')})` : `${functionName}()`;

  // Replace the Syntax section
  // Pattern: **Syntax**\n![Embedded](...)\n
  // Replace with: **Syntax**\n`functionName(param1, param2, ...)`
  const syntaxRegex = /\*\*Syntax\*\*\s*\n\s*!\[Embedded\]\([^\)]+\)\s*\n/g;

  return content.replace(syntaxRegex, (match) => {
    return `**Syntax**\n\`${functionSignature}\`\n\n`;
  });
}

function stripMarkdownTables(content: string): string {
  // Strip markdown tables: rows with pipes and separator rows with dashes
  // Pattern: | col1 | col2 |\n|------|------|\n| val1 | val2 |
  const lines = content.split('\n');
  const result: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    const isTableRow = trimmedLine.startsWith('|') && trimmedLine.endsWith('|');

    // Check if this is a separator row (contains | and dashes like |---|---|)
    const isSeparatorRow = isTableRow && /^[\|\s\-:]+$/.test(trimmedLine);

    if (isTableRow || isSeparatorRow) {
      inTable = true;
      continue;
    } else {
      if (inTable) {
        inTable = false;
      }
      // Add the line (it's not part of a table)
      result.push(line);
    }
  }

  return result.join('\n');
}

function stripEmbeddedImages(content: string): string {
  // Strip all ![Embedded](...) markdown image syntax
  // Pattern: ![Embedded](url) or ![Embedded](url "title")
  // Handle URLs with parentheses by matching until the closing )
  return content.replace(/!\[Embedded\]\([^\)]*(?:\([^\)]*\))*[^\)]*\)/g, '');
}

function stripMarkdownLinks(content: string): string {
  // Strip markdown links: [text](url) -> text
  // Pattern: [link text](url) or [link text](url "title")
  // Handle URLs with parentheses by processing from right to left
  let result = content;
  // Find all link patterns and replace them
  // Match [text] followed by (url) where we need to find the correct closing )
  // Strategy: find [text]( and then match until the last ) before space/punctuation/end
  const linkRegex = /\[([^\]]+)\]\(/g;
  let match;
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  // Find all link starts
  while ((match = linkRegex.exec(result)) !== null) {
    const linkStart = match.index;
    const text = match[1];
    const urlStart = match.index + match[0].length;

    // Find the matching closing parenthesis
    // Look for ) that's followed by space, punctuation, or end of string
    let parenCount = 1; // We already have the opening (
    let pos = urlStart;
    let urlEnd = -1;

    while (pos < result.length && parenCount > 0) {
      if (result[pos] === '(') parenCount++;
      else if (result[pos] === ')') {
        parenCount--;
        if (parenCount === 0) {
          // Check if this ) is followed by space, punctuation, or end
          const nextChar = pos + 1 < result.length ? result[pos + 1] : '';
          if (nextChar === '' || /[\s.,;:!?)\]}]/.test(nextChar)) {
            urlEnd = pos;
            break;
          } else {
            // This ) is part of the URL, continue
            parenCount++;
          }
        }
      }
      pos++;
    }

    if (urlEnd > 0) {
      replacements.push({
        start: linkStart,
        end: urlEnd + 1,
        text,
      });
    }
  }

  // Apply replacements from right to left to maintain indices
  replacements.reverse();
  for (const repl of replacements) {
    result = result.substring(0, repl.start) + repl.text + result.substring(repl.end);
  }

  // Fallback: handle any remaining simple links
  result = result.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  return result;
}

function reorganizeContent(content: string, functionName: string): string {
  // Extract description section
  const descriptionRegex = /\*\*Description\*\*\s*\n([\s\S]*?)(?=\*\*|\n\n\n|$)/;
  const descriptionMatch = content.match(descriptionRegex);

  let descriptionText = '';
  if (descriptionMatch && descriptionMatch[1]) {
    descriptionText = descriptionMatch[1].trim();
  }

  // Remove the original Description section
  let reorganizedContent = content.replace(/\*\*Description\*\*\s*\n[\s\S]*?(?=\*\*|\n\n\n|$)/, '');

  // If we found a description, prepend it to the top with function name as heading
  if (descriptionText) {
    // Strip embedded images and markdown links from description
    descriptionText = stripEmbeddedImages(descriptionText);
    descriptionText = stripMarkdownLinks(descriptionText);
    const descriptionWithHeading = `# ${functionName}\n\n${descriptionText}`;
    reorganizedContent = `${descriptionWithHeading}\n\n${reorganizedContent}`;
  } else {
    // Even if no description, add the heading
    reorganizedContent = `# ${functionName}\n\n${reorganizedContent}`;
  }

  reorganizedContent = stripMarkdownTables(
    stripMarkdownLinks(stripEmbeddedImages(reorganizedContent))
  );

  // Clean up multiple consecutive newlines
  reorganizedContent = reorganizedContent.replace(/\n{3,}/g, '\n\n');

  return reorganizedContent;
}

function convertDefinitionsToMarkdown(content: string): string {
  // Convert <definitions> XML to markdown format optimized for LLM understanding
  // Pattern: <definitions><definition term="paramName">content</definition></definitions>
  // Should become: ### Parameters\n#### `paramName`\ncontent
  // Also remove the **Parameters** line if it exists before the definitions

  // First, remove **Parameters** lines that appear before definitions blocks
  content = content.replace(/\*\*Parameters\*\*\s*\n\s*<definitions>/g, '<definitions>');

  const definitionsRegex = /<definitions>([\s\S]*?)<\/definitions>/g;

  return content.replace(definitionsRegex, (match, definitionsContent) => {
    // Extract individual definition elements
    const definitionRegex = /<definition\s+term="([^"]+)">([\s\S]*?)<\/definition>/g;
    const definitions: Array<{ term: string; content: string }> = [];

    let defMatch: RegExpExecArray | null;
    while ((defMatch = definitionRegex.exec(definitionsContent)) !== null) {
      const term = defMatch[1];
      const rawContent = defMatch[2].trim();

      // Strip embedded images, markdown links, and markdown tables
      let defContent = stripEmbeddedImages(rawContent);
      defContent = stripMarkdownLinks(defContent);
      defContent = stripMarkdownTables(defContent);

      // Normalize whitespace - replace multiple spaces/newlines with single newline
      defContent = defContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
      defContent = defContent.replace(/[ \t]+/g, ' ');

      definitions.push({ term, content: defContent });
    }

    if (definitions.length === 0) {
      return match; // Return original if no definitions found
    }

    // Build markdown format optimized for LLM parsing
    // Clear structure: heading, parameter name, description
    const markdown = ['### Parameters', ''];
    for (const def of definitions) {
      // Parameter name as clear heading
      markdown.push(`#### \`${def.term}\``);
      markdown.push('');
      // Clean description text
      markdown.push(def.content.trim());
      markdown.push('');
    }

    return markdown.join('\n');
  });
}

/**
 * Extract raw function sections from markdown (before processing)
 * Returns sections with raw content for hashing
 */
function extractRawFunctionSections(content: string): Array<{ name: string; rawContent: string }> {
  // Extract YAML block if present and get content after it
  const yamlBlockRegex = /```yaml\n([\s\S]*?)```([\s\S]*)/;
  const yamlMatch = content.match(yamlBlockRegex);

  let contentToProcess = content;
  if (yamlMatch) {
    // Use content after YAML block
    contentToProcess = yamlMatch[2] || content;
  }

  // Remove YAML frontmatter if present
  contentToProcess = contentToProcess.replace(/^---[\s\S]*?---\n/, '');

  // Split by ## headings (function sections)
  // Match ## `FUNCTION_NAME` or ## FUNCTION_NAME
  const functionSectionRegex = /^##\s+(?:`)?([^`\n]+)(?:`)?$/gm;
  const sections: Array<{ name: string; rawContent: string }> = [];

  let match: RegExpExecArray | null;
  const functionMatches: Array<{ name: string; startIndex: number }> = [];

  // Find all function section headers
  while ((match = functionSectionRegex.exec(contentToProcess)) !== null) {
    const functionName = match[1].trim();
    const startIndex = match.index;
    functionMatches.push({ name: functionName, startIndex });
  }

  // Extract raw content for each function section (before processing)
  for (let i = 0; i < functionMatches.length; i++) {
    const currentMatch = functionMatches[i];
    const nextMatch = functionMatches[i + 1];

    const sectionStart = currentMatch.startIndex;
    const sectionEnd = nextMatch ? nextMatch.startIndex : contentToProcess.length;

    let rawSectionContent = contentToProcess.substring(sectionStart, sectionEnd).trim();

    // Remove the ## heading line and keep the rest
    const lines = rawSectionContent.split('\n');
    if (lines.length > 0 && lines[0].startsWith('##')) {
      rawSectionContent = lines.slice(1).join('\n').trim();
    }

    if (rawSectionContent) {
      sections.push({
        name: currentMatch.name.toLowerCase(),
        rawContent: rawSectionContent,
      });
    }
  }

  return sections;
}

/**
 * Process a raw section into final content
 */
function processSection(rawContent: string, functionName: string): string {
  let sectionContent = rawContent;

  // Convert definitions to markdown format
  sectionContent = convertDefinitionsToMarkdown(sectionContent);

  // Rewrite syntax section with function signature
  const functionNameUpper = functionName.toUpperCase().replace(/[`'"]/g, '');
  sectionContent = rewriteSyntaxSection(sectionContent, functionNameUpper);

  // Reorganize content: move description to top with function name
  sectionContent = reorganizeContent(sectionContent, functionNameUpper);

  return sectionContent;
}

/**
 * Extract brief description from raw section content
 */
function extractBriefDescription(rawContent: string): string {
  // Extract description section
  const descriptionRegex = /\*\*Description\*\*\s*\n([\s\S]*?)(?=\*\*|\n\n\n|$)/;
  const descriptionMatch = rawContent.match(descriptionRegex);

  if (descriptionMatch && descriptionMatch[1]) {
    let description = descriptionMatch[1].trim();
    // Take first sentence or first line, whichever is shorter
    const firstSentence = description.split(/[.!?]\s+/)[0];
    const firstLine = description.split('\n')[0];
    description = firstSentence.length < firstLine.length ? firstSentence : firstLine;
    // Clean up: remove markdown formatting, limit length
    description = description
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
    // Limit to reasonable length (first 200 chars)
    if (description.length > 200) {
      description = description.substring(0, 197) + '...';
    }
    return description;
  }
  return '';
}

/**
 * Map markdown file name to syntax.txt section name
 */
function getSyntaxSectionName(mdFileName: string): string {
  // Remove .md extension and convert to section format
  const baseName = mdFileName.replace(/\.md$/, '');
  // Map specific file names to section names
  const sectionMap: { [key: string]: string } = {
    'aggregation-functions': 'aggregation-functions',
    'time-series-aggregation-functions': 'time-series-aggregation-functions',
    'conditional-functions-and-expressions': 'conditional-functions',
    'date-time-functions': 'date-time-functions',
    'dense-vector-functions': 'dense-vector-functions',
    'grouping-functions': 'grouping-functions',
    'ip-functions': 'ip-functions',
    'math-functions': 'math-functions',
    'mv-functions': 'mv-functions',
    operators: 'operators',
    'search-functions': 'search-functions',
    'spatial-functions': 'spatial-functions',
    'string-functions': 'string-functions',
    'type-conversion-functions': 'type-conversion-functions',
  };
  return sectionMap[baseName] || baseName;
}

/**
 * Update syntax.txt file with function descriptions
 */
async function updateSyntaxFile(
  syntaxFilePath: string,
  mdFileName: string,
  functionDescriptions: Array<{ name: string; description: string }>,
  log: any
): Promise<void> {
  try {
    // Read current syntax.txt
    let syntaxContent = await Fs.readFile(syntaxFilePath, 'utf-8');
    const sectionName = getSyntaxSectionName(mdFileName);
    const sectionTag = `<${sectionName}>`;
    const closingTag = `</${sectionName}>`;

    // Find the section
    const sectionStart = syntaxContent.indexOf(sectionTag);

    if (sectionStart === -1) {
      log.warning(
        `Section ${sectionTag} not found in syntax.txt, skipping update for ${mdFileName}`
      );
      return;
    }

    // Find the LAST occurrence of the closing tag (in case there are duplicates)
    const sectionEnd = syntaxContent.lastIndexOf(closingTag);
    if (sectionEnd === -1) {
      log.warning(
        `Closing tag ${closingTag} not found in syntax.txt, skipping update for ${mdFileName}`
      );
      return;
    }

    // Extract content before and after the section
    const beforeSection = syntaxContent.substring(0, sectionStart + sectionTag.length);
    // Find the position after the LAST closing tag
    const afterSectionStart = sectionEnd + closingTag.length;
    let afterSection = syntaxContent.substring(afterSectionStart);

    // Strip any leading closing tags from afterSection (in case of duplicates)
    while (afterSection.trim().startsWith(closingTag)) {
      afterSection = afterSection.substring(afterSection.indexOf(closingTag) + closingTag.length);
    }

    // Build new section content
    const sectionEntries = functionDescriptions
      .filter((f) => f.description) // Only include functions with descriptions
      .map((f) => {
        const functionName = f.name.toUpperCase();
        return `        ${functionName}: ${f.description}`;
      })
      .join('\n');

    // Reconstruct syntax.txt with updated section
    syntaxContent = `${beforeSection}\n${sectionEntries}\n    ${closingTag}${afterSection}`;

    // Write updated content
    await Fs.writeFile(syntaxFilePath, syntaxContent, 'utf-8');
  } catch (error) {
    log.warning(
      `Failed to update syntax.txt for ${mdFileName}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

interface FileToWrite {
  name: string;
  content: string;
}

async function generateDoc({
  docFiles,
  inferenceClient,
  log,
}: {
  docFiles: Array<{ name: string; content: string }>;
  inferenceClient: ReturnType<KibanaClient['createInferenceClient']>;
  log: any;
}): Promise<FileToWrite[]> {
  const filesToWrite: FileToWrite[] = [];
  const limiter = pLimit(10);

  const callOutput = bindOutput({
    connectorId: inferenceClient.getConnectorId(),
    output: inferenceClient.output,
  });

  // Create a minimal documentation object for context
  // This helps the LLM understand the context when rewriting
  const documentation = JSON.stringify(
    {
      note: 'This documentation is being generated from extracted ES|QL command and function documentation.',
    },
    undefined,
    2
  );

  await Promise.all(
    docFiles.map(async (docFile) => {
      return limiter(async () => {
        // Determine if it's a command or function based on the content
        // Commands typically start with # and have specific patterns
        const isCommand =
          docFile.content.includes('**Syntax**') && !docFile.content.match(/^# [A-Z_]+$/m);

        const rewrittenContent = await callOutput(
          rewriteFunctionPagePrompt({
            content: docFile.content,
            documentation,
            command: isCommand,
          })
        );
        filesToWrite.push({
          name: docFile.name,
          content: rewrittenContent,
        });
      });
    })
  );

  return filesToWrite;
}

yargs(process.argv.slice(2))
  .command(
    '*',
    'Extract ES|QL documentation from zip file',
    (y: Argv) =>
      y
        .option('logLevel', {
          describe: 'Log level',
          string: true,
          default: process.env.LOG_LEVEL || 'info',
          choices: ['info', 'debug', 'silent', 'verbose'],
        })
        .option('dryRun', {
          describe: 'Do not write or delete any files',
          boolean: true,
          default: false,
        })
        .option('force', {
          describe: 'Force update all files even if content hash matches',
          boolean: true,
          default: false,
        })
        .option('kibana', kibanaOption)
        .option('elasticsearch', elasticsearchOption)
        .option('connectorId', connectorIdOption),
    (argv) => {
      run(
        async ({ log }) => {
          // Set up inference client if connectorId is provided
          let inferenceClient: ReturnType<KibanaClient['createInferenceClient']> | undefined;

          if (argv.connectorId) {
            const serviceUrls = await getServiceUrls({
              log,
              elasticsearch: argv.elasticsearch,
              kibana: argv.kibana,
            });

            const kibanaClient = new KibanaClient(log, serviceUrls.kibanaUrl);

            const connectors = await kibanaClient.getConnectors();
            if (!connectors.length) {
              throw new Error('No connectors found');
            }
            const connector = await selectConnector({
              connectors,
              preferredId: argv.connectorId,
              log,
            });
            log.info(`Using connector ${connector.connectorId}`);

            inferenceClient = kibanaClient.createInferenceClient({
              connectorId: connector.connectorId,
            });

            try {
              const callOutput = bindOutput({
                connectorId: inferenceClient.getConnectorId(),
                output: inferenceClient.output,
              });
              const resp = await callOutput({
                input: 'Test',
                system:
                  'You are a helpful assistant. Respond with "OK" to confirm you are working.',
              });
              log.success(`✅ Connected to connector ${connector.connectorId} ${resp}`);
            } catch (error) {
              log.error(`❌ Unable to connect to connector ${connector.connectorId}: ${error}`);
              throw error;
            }
          }

          const zipUrl = 'http://elastic.co/docs/llm.zip';
          const tempDir = Path.join(__dirname, '__tmp__');
          const zipPath = Path.join(tempDir, 'llm.zip');
          const extractTempDir = await mkdtemp(Path.join(Path.sep, 'tmp', 'esql-docs-'));
          const extractDir = Path.join(extractTempDir, 'extracted');
          const commandsDir = Path.join(
            extractDir,
            'reference',
            'query-languages',
            'esql',
            'commands'
          );
          const functionsOperatorsDir = Path.join(
            extractDir,
            'reference',
            'query-languages',
            'esql',
            'functions-operators'
          );
          const outDir = Path.join(__dirname, '../../server/tasks/nl_to_esql/esql_docs');
          const syntaxFilePath = Path.join(
            __dirname,
            '../../server/tasks/nl_to_esql/prompts/syntax.txt'
          );

          try {
            // Check if zip file already exists
            const zipExists = await Fs.access(zipPath)
              .then(() => true)
              .catch(() => false);

            if (zipExists) {
              log.info(`Zip file already exists at ${zipPath}, skipping download`);
            } else {
              log.info(`Downloading zip file from ${zipUrl}...`);
              await Fs.mkdir(tempDir, { recursive: true });
              await downloadFile(zipUrl, zipPath);
              log.info(`Downloaded to ${zipPath}`);
            }

            log.info(`Extracting zip file to ${extractDir}...`);
            try {
              // Use native unzip command which is more robust
              execSync(`unzip -q -o "${zipPath}" -d "${extractDir}"`, {
                stdio: 'inherit',
              });
              log.info(`Extracted to ${extractDir}`);
            } catch (error) {
              // Try with extract function as fallback
              log.warning(
                `Native unzip failed, trying alternative extraction method: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              const { extract } = await import('@kbn/dev-utils');
              try {
                await extract({
                  archivePath: zipPath,
                  targetDir: extractDir,
                });
              } catch (extractError) {
                log.warning(
                  `Extraction encountered errors: ${
                    extractError instanceof Error ? extractError.message : String(extractError)
                  }`
                );
              }
            }

            const commandsPathExists = await Fs.access(commandsDir)
              .then(() => true)
              .catch(() => false);

            if (!commandsPathExists) {
              throw new Error(
                `Commands directory not found at ${commandsDir}. Please verify the zip file structure.`
              );
            }

            const files = await Fs.readdir(commandsDir);
            const mdFiles = files.filter((file) => file.endsWith('.md'));

            if (mdFiles.length === 0) {
              throw new Error(`No .md files found in ${commandsDir}`);
            }

            log.info(`Found ${mdFiles.length} markdown files in commands directory`);

            // Initialize cache
            const cachePath = Path.join(__dirname, '.file-cache.json');
            const cache = await loadCache(cachePath);
            let cacheUpdated = false;

            const docFiles: Array<{ name: string; content: string }> = [];
            // Map output file names to source file paths for cache lookup
            const outputToSourceMap = new Map<string, string>();

            // Process commands
            for (const mdFile of mdFiles) {
              const filePath = Path.join(commandsDir, mdFile);
              const content = await Fs.readFile(filePath, 'utf-8');
              const contentHash = hashContent(content);
              const cacheKey = normalizeCacheKey(filePath, extractDir);

              // Check if file is cached and unchanged (unless force flag is set)
              const cached = cache[cacheKey];
              if (!argv.force && cached && cached.hash === contentHash) {
                // File hash matches, verify output files exist on disk
                if (cached.outputFiles && cached.outputFiles.length > 0) {
                  const allOutputFilesExist = await Promise.all(
                    cached.outputFiles.map(async (outputFileName) => {
                      const outputFilePath = Path.join(outDir, outputFileName);
                      try {
                        await Fs.access(outputFilePath);
                        return true;
                      } catch {
                        return false;
                      }
                    })
                  ).then((results) => results.every((exists) => exists));

                  if (allOutputFilesExist) {
                    // All output files exist, skip processing
                    for (const outputFileName of cached.outputFiles) {
                      outputToSourceMap.set(outputFileName, cacheKey);
                    }
                    log.debug(
                      `Skipping extraction for ${mdFile} (hash: ${contentHash.substring(
                        0,
                        8
                      )}...) - all output files exist`
                    );
                    continue;
                  } else {
                    // Some output files are missing, process the file
                  }
                } else {
                  // No output files in cache, skip
                  continue;
                }
              }

              // File changed or not in cache, process it
              log.info(`Processing ${mdFile} (hash: ${contentHash.substring(0, 8)}...)`);
              let yamlContent = extractYamlCodeBlocks(content);

              if (yamlContent) {
                // Convert definitions to markdown format
                yamlContent = convertDefinitionsToMarkdown(yamlContent);

                // Rewrite syntax section with command signature
                const commandName = getCommandName(mdFile);
                const commandNameUpper = commandName.toUpperCase();
                yamlContent = rewriteSyntaxSection(yamlContent, commandNameUpper);

                // Reorganize content: move description to top with command name
                yamlContent = reorganizeContent(yamlContent, commandNameUpper);

                const outputFileName = `esql-${commandName}.txt`;
                const outputFile = {
                  name: outputFileName,
                  content: yamlContent,
                };
                docFiles.push(outputFile);
                outputToSourceMap.set(outputFileName, cacheKey);

                // Update cache - only store file names, not content
                cache[cacheKey] = {
                  hash: contentHash,
                  outputFiles: [outputFileName],
                };
                cacheUpdated = true;
              } else {
                log.warning(`No YAML code blocks found in ${mdFile}, skipping`);
              }
            }
            if (docFiles.length > 0) {
              log.info(`✅ Found ${docFiles.length} new documents to process`);
            } else {
              log.info(`⏰ No new content detected compared to previous run`);
            }

            // Process functions-operators
            const functionsOperatorsPathExists = await Fs.access(functionsOperatorsDir)
              .then(() => true)
              .catch(() => false);

            if (functionsOperatorsPathExists) {
              const functionFiles = await Fs.readdir(functionsOperatorsDir);
              const functionMdFiles = functionFiles.filter((file) => file.endsWith('.md'));

              if (functionMdFiles.length > 0) {
                for (const mdFile of functionMdFiles) {
                  const filePath = Path.join(functionsOperatorsDir, mdFile);
                  const content = await Fs.readFile(filePath, 'utf-8');
                  const contentHash = hashContent(content);
                  const cacheKey = normalizeCacheKey(filePath, extractDir);

                  // Check if file is cached and unchanged (unless force flag is set)
                  const cached = cache[cacheKey];
                  if (!argv.force && cached && cached.hash === contentHash) {
                    // Source file hash matches, verify output files exist on disk
                    if (cached.outputFiles && cached.outputFiles.length > 0) {
                      const allOutputFilesExist = await Promise.all(
                        cached.outputFiles.map(async (outputFileName) => {
                          const outputFilePath = Path.join(outDir, outputFileName);
                          try {
                            await Fs.access(outputFilePath);
                            return true;
                          } catch {
                            return false;
                          }
                        })
                      ).then((results) => results.every((exists) => exists));

                      if (allOutputFilesExist) {
                        // All output files exist, skip processing
                        log.debug(
                          `Skipping ${mdFile} (hash: ${contentHash.substring(0, 8)}... unchanged)`
                        );
                        for (const outputFileName of cached.outputFiles) {
                          outputToSourceMap.set(outputFileName, cacheKey);
                        }
                        continue;
                      } else {
                        // Some output files are missing, process the file
                      }
                    } else {
                      // No output files in cache, skip
                      continue;
                    }
                  }

                  // Extract raw sections and check which ones have changed
                  const rawSections = extractRawFunctionSections(content);
                  const outputFiles: Array<{ name: string; content: string }> = [];
                  const outputFileNames: string[] = [];
                  const sectionHashes: { [outputFileName: string]: string } = {};

                  if (rawSections.length > 0) {
                    // Initialize cache entry if it doesn't exist
                    if (!cache[cacheKey]) {
                      cache[cacheKey] = {
                        hash: contentHash,
                        sections: {},
                        outputFiles: [],
                      };
                    }

                    for (const section of rawSections) {
                      const outputFileName = `esql-${section.name}.txt`;
                      const sectionHash = hashContent(section.rawContent);
                      sectionHashes[outputFileName] = sectionHash;

                      // Check if this section has changed (unless force flag is set)
                      const cachedSectionHash = cache[cacheKey].sections?.[outputFileName]?.hash;
                      const sectionHashMatches = cachedSectionHash === sectionHash;

                      // Also check if output file exists on disk
                      let outputFileExists = false;
                      if (sectionHashMatches && !argv.force) {
                        const outputFilePath = Path.join(outDir, outputFileName);
                        try {
                          await Fs.access(outputFilePath);
                          outputFileExists = true;
                        } catch {
                          outputFileExists = false;
                        }
                      }

                      const sectionChanged =
                        argv.force ||
                        !cachedSectionHash ||
                        cachedSectionHash !== sectionHash ||
                        !outputFileExists;

                      if (sectionChanged) {
                        // Process the section
                        const processedContent = processSection(section.rawContent, section.name);
                        const outputFile = {
                          name: outputFileName,
                          content: processedContent,
                        };
                        outputFiles.push(outputFile);
                        docFiles.push(outputFile);
                        outputToSourceMap.set(outputFileName, cacheKey);
                      } else {
                        // Section unchanged, skip processing
                        log.debug(
                          `Skipping unchanged section ${section.name} from ${mdFile} -> ${outputFileName}`
                        );
                      }

                      outputFileNames.push(outputFileName);
                      outputToSourceMap.set(outputFileName, cacheKey);
                    }

                    // Update cache with section hashes and file list
                    cache[cacheKey].hash = contentHash;
                    if (!cache[cacheKey].sections) {
                      cache[cacheKey].sections = {};
                    }
                    for (const [outputFileName, sectionHash] of Object.entries(sectionHashes)) {
                      if (!cache[cacheKey].sections![outputFileName]) {
                        cache[cacheKey].sections![outputFileName] = { hash: sectionHash };
                      } else {
                        cache[cacheKey].sections![outputFileName].hash = sectionHash;
                      }
                    }
                    cache[cacheKey].outputFiles = outputFileNames;
                    cacheUpdated = true;

                    // Extract descriptions and update syntax.txt
                    const functionDescriptions = rawSections.map((section) => ({
                      name: section.name,
                      description: extractBriefDescription(section.rawContent),
                    }));

                    await updateSyntaxFile(syntaxFilePath, mdFile, functionDescriptions, log);
                  } else {
                    log.warning(`No function sections found in ${mdFile}, skipping`);
                  }
                }
              } else {
                log.warning(`No .md files found in ${functionsOperatorsDir}`);
              }
            } else {
              log.warning(`Functions-operators directory not found at ${functionsOperatorsDir}`);
            }

            // Use LLM to rewrite documentation if connectorId is provided
            let finalDocFiles = docFiles;
            if (inferenceClient) {
              // Capture inferenceClient in a const for TypeScript narrowing
              const client = inferenceClient;
              // Process all files that made it through (unchanged files were already skipped)
              const filesToProcess: Array<{
                name: string;
                content: string;
                sourcePath?: string;
              }> = docFiles.map((file) => {
                const sourcePath = outputToSourceMap.get(file.name);
                return { ...file, sourcePath };
              });

              if (filesToProcess.length > 0) {
                // log.info(`Rewriting ${filesToProcess.length} documents using LLM...`);
                const rewrittenFiles = await generateDoc({
                  docFiles: filesToProcess,
                  inferenceClient: client,
                  log,
                });
                log.info(`Successfully rewritten ${rewrittenFiles.length} documents`);

                // Enrich documentation with natural language descriptions for ES|QL queries
                log.info(
                  `Enriching ${rewrittenFiles.length} documents with ES|QL query descriptions...`
                );
                const limiter = pLimit(10);
                finalDocFiles = await Promise.all(
                  rewrittenFiles.map(async (file) => {
                    return limiter(async () => {
                      const enrichedContent = await enrichDocumentation({
                        content: file.content,
                        inferenceClient: client,
                      });
                      // log.info(`Enriched ${file.name} with ES|QL query descriptions`);
                      return {
                        name: file.name,
                        content: enrichedContent,
                      };
                    });
                  })
                );
                log.info(`Successfully enriched ${finalDocFiles.length} documents`);
              }
            }

            if (!argv.dryRun) {
              log.info(`Writing ${finalDocFiles.length} documents to disk to ${outDir}`);

              await Fs.mkdir(outDir, { recursive: true });

              await Promise.all(
                finalDocFiles.map(async (file) => {
                  const fileName = Path.join(outDir, file.name);
                  await Fs.writeFile(fileName, file.content);
                })
              );

              // log.info(`Successfully wrote ${finalDocFiles.length} files to ${outDir}`);
            } else {
              // log.info(`Dry run: Would write ${finalDocFiles.length} files to ${outDir}`);
            }

            // Save cache if it was updated
            if (cacheUpdated && !argv.dryRun) {
              await saveCache(cachePath, cache);
              log.info(`Cache updated and saved to ${cachePath}`);
            }
          } finally {
            // Clean up extraction temp directory (but keep the zip file in _temp_)
            log.info(`Cleaning up temporary extraction directory ${extractTempDir}...`);
            await Fs.rm(extractTempDir, { recursive: true, force: true }).catch((err) => {
              log.warning(`Failed to clean up temp directory: ${err.message}`);
            });
          }
        },
        { log: { defaultLevel: argv.logLevel as any }, flags: { allowUnexpected: true } }
      );
    }
  )
  .parse();
