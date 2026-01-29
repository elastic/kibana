/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a string to a URL-safe slug format.
 * - Converts to lowercase
 * - Normalizes accented characters (NFD)
 * - Removes accents
 * - Replaces non-alphanumeric characters with hyphens
 * - Trims leading/trailing hyphens
 *
 * @param input - The string to slugify
 * @returns A slugified version of the input string
 *
 * @example
 * slugify("Search GitHub") // "search-github"
 * slugify("Élastic Search") // "elastic-search"
 * slugify("  Test  123  ") // "test-123"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD') // split accented characters
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumerics with -
    .replace(/^-+|-+$/g, ''); // trim leading/trailing -
}

/**
 * Generates a prefixed name for workflows/tools using the source type and user-inputted name.
 * This is useful when you need to prefix something with the type and data connector name
 * but will add the action name separately.
 * Format: `${sourceType}.${slugify(name)}`
 *
 * @param sourceType - The data source type (e.g., "notion", "github")
 * @param name - The user-inputted data connector name
 * @returns A prefixed name in the format "type.name"
 *
 * @example
 * generatePrefixedName("notion", "My Data Source") // "notion.my-data-source"
 * generatePrefixedName("github", "GitHub Connector") // "github.github-connector"
 */
export function generatePrefixedName(sourceType: string, name: string): string {
  return `${sourceType}.${slugify(name)}`;
}

/**
 * Generates a workflow name or tool ID by combining the source type, user-inputted name, and action name.
 * Format: `${sourceType}.${slugify(name)}.${slugify(actionName)}`
 *
 * This method can be used for both workflow names and tool IDs since they share the same format.
 *
 * @param sourceType - The data source type (e.g., "notion", "github")
 * @param name - The user-inputted data connector name
 * @param actionName - The action/workflow name (e.g., "search", "get_page")
 * @returns A name/ID in the format "type.name.action-name"
 *
 * @example
 * generateWorkflowOrToolName("notion", "My Data Source", "search") // "notion.my-data-source.search"
 * generateWorkflowOrToolName("github", "GitHub Connector", "get_repository") // "github.github-connector.get-repository"
 */
export function generateWorkflowOrToolName(
  sourceType: string,
  name: string,
  actionName: string
): string {
  return `${sourceType}.${slugify(name)}.${slugify(actionName)}`;
}
