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

function extractFunctionSections(content: string): Array<{ name: string; content: string }> {
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
  const sections: Array<{ name: string; content: string }> = [];

  let match: RegExpExecArray | null;
  const functionMatches: Array<{ name: string; startIndex: number }> = [];

  // Find all function section headers
  while ((match = functionSectionRegex.exec(contentToProcess)) !== null) {
    const functionName = match[1].trim();
    const startIndex = match.index;
    functionMatches.push({ name: functionName, startIndex });
  }

  // Extract content for each function section
  for (let i = 0; i < functionMatches.length; i++) {
    const currentMatch = functionMatches[i];
    const nextMatch = functionMatches[i + 1];

    const sectionStart = currentMatch.startIndex;
    const sectionEnd = nextMatch ? nextMatch.startIndex : contentToProcess.length;

    let sectionContent = contentToProcess.substring(sectionStart, sectionEnd).trim();

    // Remove the ## heading line and keep the rest
    const lines = sectionContent.split('\n');
    if (lines.length > 0 && lines[0].startsWith('##')) {
      sectionContent = lines.slice(1).join('\n').trim();
    }

    if (sectionContent) {
      // Convert definitions to markdown format
      sectionContent = convertDefinitionsToMarkdown(sectionContent);

      // Rewrite syntax section with function signature
      // Use the original function name (uppercase) from the section header
      const functionName = currentMatch.name.toUpperCase().replace(/[`'"]/g, '');
      sectionContent = rewriteSyntaxSection(sectionContent, functionName);

      // Reorganize content: move description to top with function name
      sectionContent = reorganizeContent(sectionContent, functionName);

      sections.push({
        name: currentMatch.name.toLowerCase(),
        content: sectionContent,
      });
    }
  }

  return sections;
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

        try {
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
          log.info(`Rewrote ${docFile.name} using LLM`);
        } catch (error) {
          log.warning(
            `Failed to rewrite ${docFile.name}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          // Fall back to original content if LLM rewrite fails
          filesToWrite.push({
            name: docFile.name,
            content: docFile.content,
          });
        }
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
                log.info(`Extracted to ${extractDir}`);
              } catch (extractError) {
                log.warning(
                  `Extraction encountered errors: ${
                    extractError instanceof Error ? extractError.message : String(extractError)
                  }`
                );
                log.info(`Continuing with partial extraction...`);
              }
            }

            log.info(`Looking for markdown files in ${commandsDir}...`);
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

            const docFiles: Array<{ name: string; content: string }> = [];

            // Process commands
            for (const mdFile of mdFiles) {
              const filePath = Path.join(commandsDir, mdFile);
              const content = await Fs.readFile(filePath, 'utf-8');
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
                docFiles.push({
                  name: outputFileName,
                  content: yamlContent,
                });
                log.info(`Extracted YAML from ${mdFile} -> ${outputFileName}`);
              } else {
                log.warning(`No YAML code blocks found in ${mdFile}, skipping`);
              }
            }

            // Process functions-operators
            log.info(`Looking for markdown files in ${functionsOperatorsDir}...`);
            const functionsOperatorsPathExists = await Fs.access(functionsOperatorsDir)
              .then(() => true)
              .catch(() => false);

            if (functionsOperatorsPathExists) {
              const functionFiles = await Fs.readdir(functionsOperatorsDir);
              const functionMdFiles = functionFiles.filter((file) => file.endsWith('.md'));

              if (functionMdFiles.length > 0) {
                log.info(
                  `Found ${functionMdFiles.length} markdown files in functions-operators directory`
                );

                for (const mdFile of functionMdFiles) {
                  const filePath = Path.join(functionsOperatorsDir, mdFile);
                  const content = await Fs.readFile(filePath, 'utf-8');
                  const functionSections = extractFunctionSections(content);

                  if (functionSections.length > 0) {
                    for (const section of functionSections) {
                      const outputFileName = `esql-${section.name}.txt`;
                      docFiles.push({
                        name: outputFileName,
                        content: section.content,
                      });
                      log.info(
                        `Extracted function ${section.name} from ${mdFile} -> ${outputFileName}`
                      );
                    }
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
              log.info(`Rewriting ${docFiles.length} documents using LLM...`);
              finalDocFiles = await generateDoc({
                docFiles,
                inferenceClient,
                log,
              });
              log.info(`Successfully rewritten ${finalDocFiles.length} documents`);

              // Enrich documentation with natural language descriptions for ES|QL queries
              log.info(
                `Enriching ${finalDocFiles.length} documents with ES|QL query descriptions...`
              );
              const limiter = pLimit(10);
              finalDocFiles = await Promise.all(
                finalDocFiles.map(async (file) => {
                  return limiter(async () => {
                    try {
                      const enrichedContent = await enrichDocumentation({
                        content: file.content,
                        inferenceClient,
                      });
                      log.info(`Enriched ${file.name} with ES|QL query descriptions`);
                      return {
                        name: file.name,
                        content: enrichedContent,
                      };
                    } catch (error) {
                      log.warning(
                        `Failed to enrich ${file.name}: ${
                          error instanceof Error ? error.message : String(error)
                        }`
                      );
                      // Fall back to original content if enrichment fails
                      return file;
                    }
                  });
                })
              );
              log.info(`Successfully enriched ${finalDocFiles.length} documents`);
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

              log.info(`Successfully wrote ${finalDocFiles.length} files to ${outDir}`);
            } else {
              log.info(`Dry run: Would write ${finalDocFiles.length} files to ${outDir}`);
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
