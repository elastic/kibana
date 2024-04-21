/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Capitalizes the first letter of a given string and returns the modified string.
 * If the input string is empty, it returns an empty string without any modification.
 *
 * @param str - The string to capitalize the first letter of.
 * @returns The string with its first letter capitalized, with the rest of the string unchanged.
 */
export function capitalizeFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
