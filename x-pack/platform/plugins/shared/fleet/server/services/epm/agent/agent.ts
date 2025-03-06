/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Handlebars from 'handlebars';
import { load, dump } from 'js-yaml';
import type { Logger } from '@kbn/core/server';

import type { PackagePolicyConfigRecord } from '../../../../common/types';
import { PackagePolicyValidationError } from '../../../../common/errors';
import { toCompiledSecretRef } from '../../secrets';
import { PackageInvalidArchiveError } from '../../../errors';
import { appContextService } from '../..';

const handlebars = Handlebars.create();

export function compileTemplate(variables: PackagePolicyConfigRecord, templateStr: string) {
  const logger = appContextService.getLogger();
  const { vars, yamlValues } = buildTemplateVariables(logger, variables);
  let compiledTemplate: string;
  try {
    const template = handlebars.compile(templateStr, { noEscape: true });
    compiledTemplate = template(vars);
  } catch (err) {
    throw new PackageInvalidArchiveError(`Error while compiling agent template: ${err.message}`);
  }

  compiledTemplate = replaceRootLevelYamlVariables(yamlValues, compiledTemplate);
  try {
    const yamlFromCompiledTemplate = load(compiledTemplate, {});

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
    throw new PackagePolicyValidationError(error);
  }
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

function buildTemplateVariables(logger: Logger, variables: PackagePolicyConfigRecord) {
  const yamlValues: { [k: string]: any } = {};
  const vars = Object.entries(variables).reduce((acc, [key, recordEntry]) => {
    // support variables with . like key.patterns
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop();
    logger.debug(`Building agent template variables`);

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
      yamlValues[yamlKeyPlaceholder] = recordEntry.value ? load(recordEntry.value) : null;
    } else if (recordEntry.value && recordEntry.value.isSecretRef) {
      varPart[lastKeyPart] = toCompiledSecretRef(recordEntry.value.id);
    } else {
      varPart[lastKeyPart] = recordEntry.value;
    }
    return acc;
  }, {} as { [k: string]: any });

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
// Single quoted strings in yaml need to escape single quotes by doubling them
// and to respect any incoming newline we also need to double them, otherwise
// they will be replaced with a space.
function escapeStringHelper(str: string) {
  if (!str) return undefined;
  return "'" + str.replace(/\'/g, "''").replace(/\n/g, '\n\n') + "'";
}
handlebars.registerHelper('escape_string', escapeStringHelper);

/**
 * escapeMultilineStringHelper will escape a multiline string by doubling the newlines
 * and escaping single quotes.
 * This is useful when the string is multiline and needs to be escaped in a yaml file
 * without wrapping it in single quotes.
 */
function escapeMultilineStringHelper(str: string) {
  if (!str) return undefined;
  return str.replace(/\'/g, "''").replace(/\n/g, '\n\n');
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

function replaceRootLevelYamlVariables(yamlVariables: { [k: string]: any }, yamlTemplate: string) {
  if (Object.keys(yamlVariables).length === 0 || !yamlTemplate) {
    return yamlTemplate;
  }

  let patchedTemplate = yamlTemplate;
  Object.entries(yamlVariables).forEach(([key, val]) => {
    patchedTemplate = patchedTemplate.replace(new RegExp(`^"${key}"`, 'gm'), () =>
      val ? dump(val) : ''
    );
  });

  return patchedTemplate;
}
