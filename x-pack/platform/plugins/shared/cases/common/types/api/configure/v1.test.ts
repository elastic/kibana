/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MAX_ASSIGNEES_PER_CASE,
  MAX_CATEGORY_LENGTH,
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_CUSTOM_FIELD_KEY_LENGTH,
  MAX_CUSTOM_FIELD_LABEL_LENGTH,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  MAX_CUSTOM_OBSERVABLE_TYPES,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_OBSERVABLE_TYPE_KEY_LENGTH,
  MAX_OBSERVABLE_TYPE_LABEL_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_TAGS_PER_TEMPLATE,
  MAX_TEMPLATES_LENGTH,
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_KEY_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_TAG_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import { CaseSeverity } from '../../domain';
import { ConnectorTypes } from '../../domain/connector/v1';
import { CustomFieldTypes } from '../../domain/custom_field/v1';
import {
  CaseConfigureRequestParamsSchema,
  ConfigurationPatchRequestSchema,
  ConfigurationRequestSchema,
  GetConfigurationFindRequestSchema,
  CustomFieldConfigurationWithoutTypeSchema,
  TextCustomFieldConfigurationSchema,
  ToggleCustomFieldConfigurationSchema,
  NumberCustomFieldConfigurationSchema,
  TemplateConfigurationSchema,
  ObservableTypesConfigurationSchema,
} from './v1';

describe('configure', () => {
  const serviceNow = {
    id: 'servicenow-1',
    name: 'SN 1',
    type: ConnectorTypes.serviceNowITSM,
    fields: null,
  };

  describe('ConfigurationRequestSchema', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      owner: 'Cases',
    };

    it('has expected attributes in request', () => {
      const result = ConfigurationRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ConfigurationRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it(`does not accept customFields exceeding ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
      const customFields = new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'text_custom_field',
        label: 'Text custom field',
        type: CustomFieldTypes.TEXT,
        required: false,
      });
      const result = ConfigurationRequestSchema.safeParse({ ...defaultRequest, customFields });
      expect(result.success).toBe(false);
    });

    it(`does not accept templates exceeding ${MAX_TEMPLATES_LENGTH}`, () => {
      const templates = new Array(MAX_TEMPLATES_LENGTH + 1).fill({
        key: 'template_key_1',
        name: 'Template 1',
        description: 'this is first template',
        caseFields: {
          title: 'case using sample template',
        },
      });
      const result = ConfigurationRequestSchema.safeParse({ ...defaultRequest, templates });
      expect(result.success).toBe(false);
    });
  });

  describe('ConfigurationPatchRequestSchema', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      version: 'WzQ3LDFd',
    };

    it('has expected attributes in request', () => {
      const result = ConfigurationPatchRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ConfigurationPatchRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it(`does not accept customFields exceeding ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
      const customFields = new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'text_custom_field',
        label: 'Text custom field',
        type: CustomFieldTypes.TEXT,
        required: false,
      });
      const result = ConfigurationPatchRequestSchema.safeParse({ ...defaultRequest, customFields });
      expect(result.success).toBe(false);
    });

    it(`does not accept templates exceeding ${MAX_TEMPLATES_LENGTH}`, () => {
      const templates = new Array(MAX_TEMPLATES_LENGTH + 1).fill({
        key: 'template_key_1',
        name: 'Template 1',
        description: 'this is first template',
        tags: [],
        caseFields: {
          title: 'case using sample template',
        },
      });
      const result = ConfigurationPatchRequestSchema.safeParse({ ...defaultRequest, templates });
      expect(result.success).toBe(false);
    });
  });

  describe('GetConfigurationFindRequestSchema', () => {
    const defaultRequest = {
      owner: ['cases'],
    };

    it('has expected attributes in request', () => {
      const result = GetConfigurationFindRequestSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = GetConfigurationFindRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });

  describe('CaseConfigureRequestParamsSchema', () => {
    const defaultRequest = {
      configuration_id: 'basic-configuration-id',
    };

    it('has expected attributes in request', () => {
      const result = CaseConfigureRequestParamsSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = CaseConfigureRequestParamsSchema.safeParse({ ...defaultRequest, foo: 'bar' });
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

    it('does not accept key longer than 36 characters', () => {
      const longKey = 'x'.repeat(MAX_CUSTOM_FIELD_KEY_LENGTH + 1);
      const result = CustomFieldConfigurationWithoutTypeSchema.safeParse({
        ...defaultRequest,
        key: longKey,
      });
      expect(result.success).toBe(false);
    });

    it('does not accept key not in expected format', () => {
      const result = CustomFieldConfigurationWithoutTypeSchema.safeParse({
        ...defaultRequest,
        key: 'Not a proper key',
      });
      expect(result.success).toBe(false);
    });

    it('accepts a uuid as a key', () => {
      const key = uuidv4();
      const result = CustomFieldConfigurationWithoutTypeSchema.safeParse({
        ...defaultRequest,
        key,
      });
      expect(result.success).toBe(true);
    });

    it('does not accept label longer than 50 characters', () => {
      const longLabel = 'x'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);
      const result = CustomFieldConfigurationWithoutTypeSchema.safeParse({
        ...defaultRequest,
        label: longLabel,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TextCustomFieldConfigurationSchema', () => {
    const defaultRequest = {
      key: 'my_text_custom_field',
      label: 'Text Custom Field',
      type: CustomFieldTypes.TEXT,
      required: true,
    };

    it('has expected attributes in request', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('does not accept defaultValue that is not a string', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: false,
      });
      expect(result.success).toBe(false);
    });

    it(`does not accept default value longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
      });
      expect(result.success).toBe(false);
    });

    it('does not accept empty string as default value', () => {
      const result = TextCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ToggleCustomFieldConfigurationSchema', () => {
    const defaultRequest = {
      key: 'my_toggle_custom_field',
      label: 'Toggle Custom Field',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    };

    it('has expected attributes in request', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('does not accept defaultValue that is not a boolean', () => {
      const result = ToggleCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        required: true,
        defaultValue: 'foobar',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('NumberCustomFieldConfigurationSchema', () => {
    const defaultRequest = {
      key: 'my_number_custom_field',
      label: 'Number Custom Field',
      type: CustomFieldTypes.NUMBER,
      required: true,
    };

    it('has expected attributes in request', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        foo: 'bar',
      });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('does not accept defaultValue that is a string', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: 'string',
      });
      expect(result.success).toBe(false);
    });

    it('does not accept defaultValue that is a boolean', () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: false,
      });
      expect(result.success).toBe(false);
    });

    it(`does not accept default value more than ${Number.MAX_SAFE_INTEGER}`, () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: Number.MAX_SAFE_INTEGER + 1,
      });
      expect(result.success).toBe(false);
    });

    it(`does not accept default value less than ${Number.MIN_SAFE_INTEGER}`, () => {
      const result = NumberCustomFieldConfigurationSchema.safeParse({
        ...defaultRequest,
        defaultValue: Number.MIN_SAFE_INTEGER - 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TemplateConfigurationSchema', () => {
    const defaultRequest = {
      key: 'template_key_1',
      name: 'Template 1',
      description: 'this is first template',
      tags: ['foo', 'bar'],
      caseFields: {
        title: 'case using sample template',
      },
    };

    it('has expected attributes in request', () => {
      const result = TemplateConfigurationSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, foo: 'bar' });
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('does not accept key longer than 36 characters', () => {
      const longKey = 'x'.repeat(MAX_TEMPLATE_KEY_LENGTH + 1);
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, key: longKey });
      expect(result.success).toBe(false);
    });

    it('does not accept empty key', () => {
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, key: '' });
      expect(result.success).toBe(false);
    });

    it('does not accept key not in expected format', () => {
      const result = TemplateConfigurationSchema.safeParse({
        ...defaultRequest,
        key: 'Not a proper key',
      });
      expect(result.success).toBe(false);
    });

    it('accepts a uuid as a key', () => {
      const key = uuidv4();
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, key });
      expect(result.success).toBe(true);
    });

    it('does not throw when there is no description or tags', () => {
      const newRequest = {
        key: 'template_key_1',
        name: 'Template 1',
        caseFields: null,
      };
      const result = TemplateConfigurationSchema.safeParse(newRequest);
      expect(result.success).toBe(true);
    });

    it('does not accept name longer than 50 characters', () => {
      const longName = 'x'.repeat(MAX_TEMPLATE_NAME_LENGTH + 1);
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, name: longName });
      expect(result.success).toBe(false);
    });

    it('does not accept description longer than 1000 characters', () => {
      const longDesc = 'x'.repeat(MAX_TEMPLATE_DESCRIPTION_LENGTH + 1);
      const result = TemplateConfigurationSchema.safeParse({
        ...defaultRequest,
        description: longDesc,
      });
      expect(result.success).toBe(false);
    });

    it(`does not accept more than ${MAX_TAGS_PER_TEMPLATE} tags`, () => {
      const tags = Array(MAX_TAGS_PER_TEMPLATE + 1).fill('foobar');
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, tags });
      expect(result.success).toBe(false);
    });

    it(`does not accept a tag longer than ${MAX_TEMPLATE_TAG_LENGTH} characters`, () => {
      const tag = 'a'.repeat(MAX_TEMPLATE_TAG_LENGTH + 1);
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, tags: [tag] });
      expect(result.success).toBe(false);
    });

    it('does not accept empty string tag', () => {
      const result = TemplateConfigurationSchema.safeParse({ ...defaultRequest, tags: [''] });
      expect(result.success).toBe(false);
    });

    describe('caseFields', () => {
      it('strips unknown fields from caseFields', () => {
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, foo: 'bar' },
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it('accepts caseFields as null', () => {
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: null,
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...defaultRequest, caseFields: null });
      });

      it('accepts caseFields as {}', () => {
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: {},
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...defaultRequest, caseFields: {} });
      });

      it('accepts caseFields with all fields', () => {
        const caseFieldsAll = {
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
        };
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: caseFieldsAll,
        });
        expect(result.success).toBe(true);
      });

      it(`does not accept more than ${MAX_ASSIGNEES_PER_CASE} assignees`, () => {
        const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foobar' });
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, assignees },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept description longer than ${MAX_DESCRIPTION_LENGTH} characters`, () => {
        const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, description },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept more than ${MAX_TAGS_PER_CASE} tags`, () => {
        const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foobar');
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, tags },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept tag longer than ${MAX_LENGTH_PER_TAG} characters`, () => {
        const tag = 'a'.repeat(MAX_LENGTH_PER_TAG + 1);
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, tags: [tag] },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept title longer than ${MAX_TITLE_LENGTH} characters`, () => {
        const title = 'a'.repeat(MAX_TITLE_LENGTH + 1);
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, title },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept category longer than ${MAX_CATEGORY_LENGTH} characters`, () => {
        const category = 'a'.repeat(MAX_CATEGORY_LENGTH + 1);
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, category },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept customFields exceeding ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
        const customFields = Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
          key: 'first_custom_field_key',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value',
        });
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, customFields },
        });
        expect(result.success).toBe(false);
      });

      it(`does not accept a text customField longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
        const result = TemplateConfigurationSchema.safeParse({
          ...defaultRequest,
          caseFields: {
            ...defaultRequest.caseFields,
            customFields: [
              {
                key: 'first_custom_field_key',
                type: CustomFieldTypes.TEXT,
                value: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
              },
            ],
          },
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('ObservableTypesConfigurationSchema', () => {
    it('should validate a correct observable types configuration', () => {
      const validData = [
        { key: 'observable_key_1', label: 'Observable Label 1' },
        { key: 'observable_key_2', label: 'Observable Label 2' },
      ];
      const result = ObservableTypesConfigurationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(validData);
    });

    it('strips unknown fields', () => {
      const result = ObservableTypesConfigurationSchema.safeParse([
        { key: 'observable_key_1', label: 'Observable Label 1', foo: 'bar' },
      ]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual([{ key: 'observable_key_1', label: 'Observable Label 1' }]);
    });

    it('should invalidate an observable types configuration with an invalid key', () => {
      const result = ObservableTypesConfigurationSchema.safeParse([
        { key: 'Invalid Key!', label: 'Observable Label 1' },
      ]);
      expect(result.success).toBe(false);
    });

    it('should invalidate an observable types configuration with a missing label', () => {
      const result = ObservableTypesConfigurationSchema.safeParse([{ key: 'observable_key_1' }]);
      expect(result.success).toBe(false);
    });

    it('should accept an empty array', () => {
      const result = ObservableTypesConfigurationSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it('should invalidate an observable types configuration with a label exceeding max length', () => {
      const result = ObservableTypesConfigurationSchema.safeParse([
        { key: 'observable_key_1', label: 'a'.repeat(MAX_OBSERVABLE_TYPE_LABEL_LENGTH + 1) },
      ]);
      expect(result.success).toBe(false);
    });

    it('should invalidate an observable types configuration with a key exceeding max length', () => {
      const result = ObservableTypesConfigurationSchema.safeParse([
        { key: 'a'.repeat(MAX_OBSERVABLE_TYPE_KEY_LENGTH + 1), label: 'label' },
      ]);
      expect(result.success).toBe(false);
    });

    it('should invalidate an observable types configuration with observableTypes count exceeding max', () => {
      const invalidData = new Array(MAX_CUSTOM_OBSERVABLE_TYPES + 1).fill({
        key: 'foo',
        label: 'label',
      });
      const result = ObservableTypesConfigurationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
