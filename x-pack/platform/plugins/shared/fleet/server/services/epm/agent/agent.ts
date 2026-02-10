/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Handlebars from '@kbn/handlebars';
import { parse, stringify } from 'yaml';
import type { Logger } from '@kbn/core/server';
import { coerce, satisfies } from 'semver';

import type {
  PackageInfo,
  PackagePolicyConfigRecord,
  PackagePolicyInput,
  PackagePolicyInputStream,
} from '../../../../common/types';
import { PackagePolicyValidationError } from '../../../../common/errors';
import { toCompiledSecretRef } from '../../secrets';
import { PackageInvalidArchiveError } from '../../../errors';
import { appContextService } from '../..';

import {
  getHandlebarsCompiledTemplateCache,
  setHandlebarsCompiledTemplateCache,
} from '../packages/cache';

const handlebars = Handlebars.create();

export function getMetaVariables(
  pkg: Pick<PackageInfo, 'name' | 'title' | 'version'>,
  input: PackagePolicyInput,
  stream?: PackagePolicyInputStream,
  agentVersion?: string
) {
  return {
    // Package variables
    package: {
      name: pkg.name,
      title: pkg.title,
      version: pkg.version,
    },
    // Stream meta variables
    stream: {
      id: stream?.id || '',
      data_stream: {
        dataset: stream?.data_stream.dataset || '',
        type: stream?.data_stream.type || '',
      },
    },
    // Input meta variables
    input: {
      id: input?.id || '',
    },
    agent: {
      version: agentVersion,
    },
  };
}

export type MetaVariable = ReturnType<typeof getMetaVariables>;

export function compileTemplate(
  variables: PackagePolicyConfigRecord,
  metaVariable: MetaVariable,
  templateStr: string
) {
  const logger = appContextService.getLogger();
  const { vars, yamlValues } = buildTemplateVariables(logger, variables, metaVariable);
  let compiledTemplate: string;
  try {
    let template = getHandlebarsCompiledTemplateCache(templateStr);

    if (!template) {
      template = handlebars.compileAST(templateStr, { noEscape: true });
      setHandlebarsCompiledTemplateCache(templateStr, template);
    }

    compiledTemplate = template(vars);
  } catch (err) {
    throw new PackageInvalidArchiveError(`Error while compiling agent template: ${err.message}`);
  }

  compiledTemplate = replaceRootLevelYamlVariables(yamlValues, compiledTemplate);
  try {
    const yamlFromCompiledTemplate = parse(compiledTemplate);

    // Hack to keep empty string ('') values around in the end yaml because
    // `load` replaces empty strings with null
    const patchedYamlFromCompiledTemplate = Object.entries(yamlFromCompiledTemplate).reduce(
      (acc, [key, value]) => {
        if (value === null && typeof vars[key] === 'string' && vars[key].trim() === '') {
          acc[key] = '';
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as { [k: string]: any }
    );

    return replaceVariablesInYaml(yamlValues, patchedYamlFromCompiledTemplate);
  } catch (error) {
    const errorMessage = handleYamlError(error, compiledTemplate);
    throw new PackagePolicyValidationError(errorMessage, error);
  }
}

function handleYamlError(err: any, yaml: string): string {
  // Handle duplicated key errors from yaml package
  // The yaml package error message format: "Map keys must be unique at line X, column Y:..."
  if (err?.message && err.message.includes('Map keys must be unique')) {
    let key = 'unknown';
    // Try to extract the key from the error message or position
    if (err.linePos && err.linePos[0]) {
      const line = err.linePos[0].line - 1; // Convert to 0-based index
      const lines = yaml.split('\n');
      if (line >= 0 && line < lines.length) {
        const lineContent = lines[line];
        // Extract key from the line (everything before the colon)
        const colonIndex = lineContent.indexOf(':');
        if (colonIndex > 0) {
          key = lineContent.substring(0, colonIndex).trim();
        }
      }
    }
    return `YAMLException: Duplicated key "${key}" found in agent policy yaml, please check your yaml variables.`;
  }

  return err?.message || String(err);
}

function isValidKey(key: string) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

function replaceVariablesInYaml(yamlVariables: { [k: string]: any }, yaml: any) {
  if (Object.keys(yamlVariables).length === 0 || !yaml) {
    return yaml;
  }

  Object.entries(yaml).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'object') {
      yaml[key] = replaceVariablesInYaml(yamlVariables, value);
    }
    if (typeof value === 'string' && value in yamlVariables) {
      yaml[key] = yamlVariables[value];
    }
  });

  return yaml;
}

function buildTemplateVariables(
  logger: Logger,
  variables: PackagePolicyConfigRecord,
  metaVariable: MetaVariable
) {
  const yamlValues: { [k: string]: any } = {};
  const vars = Object.entries(variables).reduce((acc, [key, recordEntry]) => {
    // support variables with . like key.patterns
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop();

    if (!lastKeyPart || !isValidKey(lastKeyPart)) {
      throw new PackageInvalidArchiveError(
        `Error while compiling agent template: Invalid key ${lastKeyPart}`
      );
    }

    let varPart = acc;
    for (const keyPart of keyParts) {
      if (!isValidKey(keyPart)) {
        throw new PackageInvalidArchiveError(
          `Error while compiling agent template: Invalid key ${keyPart}`
        );
      }
      if (!varPart[keyPart]) {
        varPart[keyPart] = {};
      }
      varPart = varPart[keyPart];
    }

    if (recordEntry.type && recordEntry.type === 'yaml') {
      const yamlKeyPlaceholder = `##${key}##`;
      varPart[lastKeyPart] = recordEntry.value ? `"${yamlKeyPlaceholder}"` : null;
      yamlValues[yamlKeyPlaceholder] = recordEntry.value ? parse(recordEntry.value) : null;
    } else if (recordEntry.value && recordEntry.value.isSecretRef) {
      if (recordEntry.value.ids) {
        varPart[lastKeyPart] = recordEntry.value.ids.map((id: string) => toCompiledSecretRef(id));
      } else {
        varPart[lastKeyPart] = toCompiledSecretRef(recordEntry.value.id);
      }
    } else {
      varPart[lastKeyPart] = recordEntry.value;
    }
    return acc;
  }, {} as { [k: string]: any });

  vars._meta = metaVariable;

  return { vars, yamlValues };
}

function containsHelper(this: any, item: string, check: string | string[], options: any) {
  if ((Array.isArray(check) || typeof check === 'string') && check.includes(item)) {
    if (options && options.fn) {
      return options.fn(this);
    }
    return true;
  }
  return '';
}
handlebars.registerHelper('contains', containsHelper);

// escapeStringHelper will wrap the provided string with single quotes.
// Single quoted strings in yaml need to escape single quotes by doubling them.
// If the string contains newlines, use double quotes with escaped newlines since the yaml package
// doesn't allow literal newlines in single-quoted strings.
function escapeStringHelper(str: string) {
  if (!str) return undefined;
  if (str.includes('\n')) {
    // Use double quotes with escaped newlines for strings with newlines
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return "'" + str.replace(/\'/g, "''") + "'";
}
handlebars.registerHelper('escape_string', escapeStringHelper);

/**
 * escapeMultilineStringHelper will escape a multiline string by escaping single quotes
 * and escaping newlines as \n for use inside double quotes.
 * This is useful when the string is multiline and needs to be escaped in a yaml file
 * without wrapping it in single quotes.
 * Note: Removes spaces immediately following newlines to match js-yaml behavior.
 */
function escapeMultilineStringHelper(str: string) {
  if (!str) return undefined;
  // Remove spaces immediately after newlines to match js-yaml behavior
  // then escape single quotes and newlines for use inside double quotes
  return str.replace(/\n /g, '\n').replace(/\'/g, "''").replace(/\n/g, '\\n');
}
handlebars.registerHelper('escape_multiline_string', escapeMultilineStringHelper);

// toJsonHelper will convert any object to a Json string.
function toJsonHelper(value: any) {
  if (typeof value === 'string') {
    // if we get a string we assume is an already serialized json
    return value;
  }
  return JSON.stringify(value);
}
handlebars.registerHelper('to_json', toJsonHelper);

// urlEncodeHelper returns a string encoded as a URI component.
function urlEncodeHelper(input: string) {
  let encodedString = encodeURIComponent(input);
  // encodeURIComponent does not encode the characters -.!~*'(), known as "unreserved marks",
  // which do not have a reserved purpose but are allowed in a URI "as is". So, these have are
  // explicitly encoded. The following creates the sequences %27 %28 %29 %2A. Since the valid
  // encoding of "*" is %2A, it is necessary to call toUpperCase() to properly encode.
  encodedString = encodedString.replace(
    /[!'()*]/g,
    (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase()
  );

  return encodedString;
}
handlebars.registerHelper('url_encode', urlEncodeHelper);

function semverSatisfiesHelper(
  this: any,
  agentVersion: string,
  versionCondition: string,
  options: any
) {
  // without agent version (parent policy), the condition is not met, the conditional template is not included
  if (!agentVersion) {
    return options.inverse(this);
  }
  return satisfies(coerce(agentVersion)!, versionCondition)
    ? options.fn(this)
    : options.inverse(this);
}
// cel.yml.hbs
// {{#semverSatisfies _meta.agent.version "^9.3.0"}}
// {{/semverSatisfies}}
handlebars.registerHelper('semverSatisfies', semverSatisfiesHelper);

function replaceRootLevelYamlVariables(yamlVariables: { [k: string]: any }, yamlTemplate: string) {
  if (Object.keys(yamlVariables).length === 0 || !yamlTemplate) {
    return yamlTemplate;
  }

  let patchedTemplate = yamlTemplate;
  Object.entries(yamlVariables).forEach(([key, val]) => {
    patchedTemplate = patchedTemplate.replace(new RegExp(`^"${key}"`, 'gm'), () =>
      val ? stringify(val) : ''
    );
  });

  return patchedTemplate;
}
