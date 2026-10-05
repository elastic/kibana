/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASE_SAVED_OBJECT,
  CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
} from '../constants';
import { getSavedObjectsTypes } from './saved_object_types';

describe('getSavedObjectsTypes', () => {
  const baseTypes = [
    CASE_SAVED_OBJECT,
    CASE_CONNECTOR_MAPPINGS_SAVED_OBJECT,
    CASE_USER_ACTION_SAVED_OBJECT,
    CASE_COMMENT_SAVED_OBJECT,
    CASE_CONFIGURE_SAVED_OBJECT,
    CASE_ATTACHMENT_SAVED_OBJECT,
    CASE_FIELD_DEFINITION_SAVED_OBJECT,
  ];

  it('returns only the base types when called with no config', () => {
    expect(getSavedObjectsTypes()).toEqual(baseTypes);
  });

  it('registers cases-field-definition unconditionally, independent of the templates flag', () => {
    // The definition substrate (legacyKey linking, bidirectional pairing) must stay consistent
    // regardless of whether the templates UI/API surface is enabled (addendum A1).
    expect(getSavedObjectsTypes({ templates: { enabled: false } })).toContain(
      CASE_FIELD_DEFINITION_SAVED_OBJECT
    );
    expect(getSavedObjectsTypes({ templates: { enabled: true } })).toContain(
      CASE_FIELD_DEFINITION_SAVED_OBJECT
    );
  });

  it('excludes cases-templates when the templates flag is off', () => {
    const types = getSavedObjectsTypes({ templates: { enabled: false } });
    expect(types).not.toContain(CASE_TEMPLATE_SAVED_OBJECT);
    expect(types).toEqual(baseTypes);
  });

  it('excludes cases-templates when the templates config is omitted entirely', () => {
    expect(getSavedObjectsTypes({})).not.toContain(CASE_TEMPLATE_SAVED_OBJECT);
  });

  it('includes cases-templates only when the templates flag is on', () => {
    const types = getSavedObjectsTypes({ templates: { enabled: true } });
    expect(types).toEqual([...baseTypes, CASE_TEMPLATE_SAVED_OBJECT]);
  });
});
