/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseSeverity } from '../case/v1';
import { ConnectorTypes } from '../connector/v1';
import { CustomFieldTypes } from '../custom_field/v1';
import {
  ConfigurationAttributesSchema,
  ConfigurationSchema,
  CustomFieldConfigurationWithoutTypeSchema,
  TemplateConfigurationSchema,
  TextCustomFieldConfigurationSchema,
  ToggleCustomFieldConfigurationSchema,
  NumberCustomFieldConfigurationSchema,
} from './v1';

describe('configure', () => {
  const serviceNow = {
    id: 'servicenow-1',
    name: 'SN 1',
    type: ConnectorTypes.serviceNowITSM,
    fields: null,
  };

  const resilient = {
    id: 'resilient-2',
    name: 'Resilient',
    type: ConnectorTypes.resilient,
    fields: null,
  };

  const textCustomField = {
    key: 'text_custom_field',
    label: 'Text custom field',
    type: CustomFieldTypes.TEXT,
    required: false,
  };

  const toggleCustomField = {
    key: 'toggle_custom_field',
    label: 'Toggle custom field',
    type: CustomFieldTypes.TOGGLE,
    required: false,
  };

  const numberCustomField = {
    key: 'number_custom_field',
    label: 'Number custom field',
    type: CustomFieldTypes.NUMBER,
    required: false,
  };

  const templateWithAllCaseFields = {
    key: 'template_sample_1',
    name: 'Sample template 1',
    description: 'this is first sample template',
    tags: ['foo', 'bar', 'foobar'],
    caseFields: {
      title: 'Case with sample template 1',
      description: 'case desc',
      severity: CaseSeverity.LOW,
      category: null,
      tags: ['sample-1'],
      assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
      customFields: [
        {
          key: 'first_custom_field_key',
          type: 'text',
          value: 'this is a text field value',
        },
      ],
      connector: {
        id: 'none',
        name: 'My Connector',
        type: ConnectorTypes.none,
        fields: null,
      },
      settings: {
        syncAlerts: true,
        extractObservables: true,
      },
    },
  };

  const templateWithFewCaseFields = {
    key: 'template_sample_2',
    name: 'Sample template 2',
    tags: [],
    caseFields: {
      title: 'Case with sample template 2',
      tags: ['sample-2'],
    },
  };

  const templateWithNoCaseFields = {
    key: 'template_sample_3',
    name: 'Sample template 3',
    caseFields: null,
  };

  describe('ConfigurationAttributesSchema', () => {
    const defaultRequest = {
      connector: resilient,
      closure_type: 'close-by-user',
      customFields: [textCustomField, toggleCustomField, numberCustomField],
      templates: [],
      owner: 'cases',
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      updated_at: '2020-02-19T23:06:33.798Z',
      updated_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      observableTypes: [
        {
          key: '8498cd52-e311-4467-9073-c6056960e2ca',
          label: 'Email',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const result = ConfigurationAttributesSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ConfigurationAttributesSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ConfigurationSchema', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      customFields: [],
      templates: [templateWithAllCaseFields, templateWithFewCaseFields, templateWithNoCaseFields],
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      updated_at: '2020-02-19T23:06:33.798Z',
      updated_by: null,
      mappings: [
        {
          source: 'description',
          target: 'description',
          action_type: 'overwrite',
        },
      ],
      owner: 'cases',
      version: 'WzQ3LDFd',
      id: 'case-id',
      error: null,
      observableTypes: [
        {
          key: '8498cd52-e311-4467-9073-c6056960e2ca',
          label: 'Email',
        },
      ],
    };

    it('has expected attributes in request', () => {
      const result = ConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ConfigurationSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CustomFieldConfigurationWithoutTypeSchema', () => {
    const defaultRequest = {
      key: 'custom_field_key',
      label: 'Custom field label',
      required: false,
    };

    it('has expected attributes in request', () => {
      const result = CustomFieldConfigurationWithoutTypeSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CustomFieldConfigurationWithoutTypeSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('TextCustomFieldConfigurationSchema', () => {
    const defaultRequest = {
      key: 'my_text_custom_field',
      label: 'Text Custom Field',
      type: CustomFieldTypes.TEXT,
      required: false,
    };

    it('has expected attributes with required: false', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('has expected attributes with defaultValue', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: 'foobar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({
        ...defaultRequest,
        required: true,
        defaultValue: 'foobar',
      });
    });

    it('fails if defaultValue is not string', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: false,
      });
      expect(result.success).toBe(false);
    });

    it('strips unknown fields', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('ToggleCustomFieldConfigurationSchema', () => {
    const defaultRequest = {
      key: 'my_toggle_custom_field',
      label: 'Toggle Custom Field',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    };

    it('has expected attributes with required: false', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('has expected attributes with defaultValue', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: false,
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ ...defaultRequest, required: true, defaultValue: false });
    });

    it('fails if defaultValue is not boolean', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: 'foobar',
      });
      expect(result.success).toBe(false);
    });

    it('strips unknown fields', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('NumberCustomFieldConfigurationSchema', () => {
    const defaultRequest = {
      key: 'my_number_custom_field',
      label: 'Number Custom Field',
      type: CustomFieldTypes.NUMBER,
      required: false,
    };

    it('has expected attributes with required: false', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('has expected attributes with defaultValue', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: 0,
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ ...defaultRequest, required: true, defaultValue: 0 });
    });

    it('fails if defaultValue is not number', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: 'foobar',
      });
      expect(result.success).toBe(false);
    });

    it('strips unknown fields', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('TemplateConfigurationSchema', () => {
    const defaultRequest = templateWithAllCaseFields;

    it('has expected attributes in request', () => {
      const result = TemplateConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = TemplateConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('accepts null for caseFields', () => {
      const result = TemplateConfigurationSchema.safeParse({
        ...defaultRequest,
        caseFields: null,
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ ...defaultRequest, caseFields: null });
    });

    it('accepts few caseFields', () => {
      const result = TemplateConfigurationSchema.safeParse(templateWithFewCaseFields);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(templateWithFewCaseFields);
    });

    it('accepts {} for caseFields', () => {
      const result = TemplateConfigurationSchema.safeParse({
        ...defaultRequest,
        caseFields: {},
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ ...defaultRequest, caseFields: {} });
    });
  });
});
