/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a short 12-character alphanumeric identifier.
 */
export function generateId(): string {
  return uuidv4().replace(/-/g, '').slice(0, 12);
}

// Validation constants matching elastic-package requirements
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 256;

/**
 * Normalizes a title/name for use as an integration or data stream identifier.
 * - Trims leading/trailing whitespace
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Collapses multiple consecutive underscores into one
 * - Removes leading/trailing underscores for compatibility
 */
export const normalizeTitleName = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[ _]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Validates that a name contains only valid characters for Elastic integrations.
 * Allowed: lowercase letters, numbers, underscores, and spaces (spaces will be converted to underscores).
 * @returns true if valid, false otherwise
 */
export const isValidNameFormat = (value: string): boolean => {
  if (!value) return true;
  return /^[a-zA-Z0-9_ ]+$/.test(value.trim());
};

/**
 * Validates that a name starts with a letter (required for integration names).
 * After normalization, names must start with a letter or underscore, but we encourage
 * starting with a letter for better compatibility.
 * @returns true if starts with a letter, false otherwise
 */
export const startsWithLetter = (value: string): boolean => {
  if (!value) return true;
  const trimmed = value.trim();
  return /^[a-zA-Z]/.test(trimmed);
};

/**
 * Validates that a name is not purely numeric (after removing spaces/underscores).
 * Names must contain at least one letter.
 * @returns true if valid (contains at least one letter), false if purely numeric
 */
export const isNotPurelyNumeric = (value: string): boolean => {
  if (!value) return true;
  const alphanumericOnly = value.replace(/[_ ]/g, '');
  return /[a-zA-Z]/.test(alphanumericOnly);
};

/**
 * Validates that a name meets the minimum length requirement (2 characters after normalization).
 * @returns true if valid, false otherwise
 */
export const meetsMinLength = (value: string): boolean => {
  if (!value) return true;
  const normalized = normalizeTitleName(value);
  return normalized.length >= MIN_NAME_LENGTH;
};

/**
 * Validates that a name does not exceed the maximum length (256 characters).
 * @returns true if valid, false otherwise
 */
export const meetsMaxLength = (value: string): boolean => {
  if (!value) return true;
  const normalized = normalizeTitleName(value);
  return normalized.length <= MAX_NAME_LENGTH;
};
