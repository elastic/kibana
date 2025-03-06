/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserActionAriaLabel } from './user_actions_aria_labels';

describe('getUserActionAriaLabel', () => {
  test('should return correct label for "create_case"', () => {
    expect(getUserActionAriaLabel('create_case')).toBe('Case initiated');
  });

  test('should return correct label for "delete_case"', () => {
    expect(getUserActionAriaLabel('delete_case')).toBe('Case deleted');
  });

  test('should return correct label for "pushed"', () => {
    expect(getUserActionAriaLabel('pushed')).toBe('pushed as new incident');
  });

  test('should return correct label for "assignees"', () => {
    expect(getUserActionAriaLabel('assignees')).toEqual('Edited "Assignees"');
  });

  test('should return correct label for "comment"', () => {
    expect(getUserActionAriaLabel('comment')).toBe('Edited "comment"');
  });

  test('should return correct label for "connector"', () => {
    expect(getUserActionAriaLabel('connector')).toBe(
      'Edited "External incident management system"'
    );
  });

  test('should return correct label for "description"', () => {
    expect(getUserActionAriaLabel('description')).toBe('Edited "Description"');
  });

  test('should return correct label for "tags"', () => {
    expect(getUserActionAriaLabel('tags')).toBe('Edited "Tags"');
  });

  test('should return correct label for "title"', () => {
    expect(getUserActionAriaLabel('title')).toBe('Edited "Title"');
  });

  test('should return correct label for "status"', () => {
    expect(getUserActionAriaLabel('status')).toBe('Edited "Status"');
  });

  test('should return correct label for "settings"', () => {
    expect(getUserActionAriaLabel('settings')).toBe('Edited "Settings"');
  });

  test('should return correct label for "severity"', () => {
    expect(getUserActionAriaLabel('severity')).toBe('Edited "Severity"');
  });

  test('should return correct label for "category"', () => {
    expect(getUserActionAriaLabel('category')).toBe('Edited "Category"');
  });

  test('should return correct label for "customFields"', () => {
    expect(getUserActionAriaLabel('customFields')).toBe('Edited "Custom Fields"');
  });
});
