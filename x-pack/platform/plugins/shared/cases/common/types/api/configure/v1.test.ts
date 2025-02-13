/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
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
  CaseConfigureRequestParamsRt,
  ConfigurationPatchRequestRt,
  ConfigurationRequestRt,
  GetConfigurationFindRequestRt,
  CustomFieldConfigurationWithoutTypeRt,
  TextCustomFieldConfigurationRt,
  ToggleCustomFieldConfigurationRt,
  NumberCustomFieldConfigurationRt,
  TemplateConfigurationRt,
  ObservableTypesConfigurationRt,
} from './v1';

describe('configure', () => {
  const serviceNow = {
    id: 'servicenow-1',
    name: 'SN 1',
    type: ConnectorTypes.serviceNowITSM,
    fields: null,
  };

  describe('ConfigurationRequestRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      owner: 'Cases',
    };

    it('has expected attributes in request', () => {
      const query = ConfigurationRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has expected attributes in request with customFields', () => {
      const request = {
        ...defaultRequest,
        customFields: [
          {
            key: 'text_custom_field',
            label: 'Text custom field',
            type: CustomFieldTypes.TEXT,
            required: false,
          },
          {
            key: 'toggle_custom_field',
            label: 'Toggle custom field',
            type: CustomFieldTypes.TOGGLE,
            required: false,
          },
          {
            key: 'number_custom_field',
            label: 'Number custom field',
            type: CustomFieldTypes.NUMBER,
            required: false,
          },
        ],
      };
      const query = ConfigurationRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it('has expected attributes in request with observableTypes', () => {
      const request = {
        ...defaultRequest,
        observableTypes: [
          {
            key: '371357ae-77ce-44bd-88b7-fbba9c80501f',
            label: 'Example Label',
          },
        ],
      };
      const query = ConfigurationRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it(`limits customFields to ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
      const customFields = new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'text_custom_field',
        label: 'Text custom field',
        type: CustomFieldTypes.TEXT,
        required: false,
      });

      expect(
        PathReporter.report(ConfigurationRequestRt.decode({ ...defaultRequest, customFields }))[0]
      ).toContain(
        `The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}`
      );
    });

    it('has expected attributes in request with templates', () => {
      const request = {
        ...defaultRequest,
        templates: [
          {
            key: 'template_key_1',
            name: 'Template 1',
            description: 'this is first template',
            tags: ['foo', 'bar'],
            caseFields: {
              title: 'case using sample template',
            },
          },
          {
            key: 'template_key_2',
            name: 'Template 2',
            description: 'this is second template',
            tags: [],
            caseFields: null,
          },
        ],
      };
      const query = ConfigurationRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it(`limits templates to ${MAX_TEMPLATES_LENGTH}`, () => {
      const templates = new Array(MAX_TEMPLATES_LENGTH + 1).fill({
        key: 'template_key_1',
        name: 'Template 1',
        description: 'this is first template',
        caseFields: {
          title: 'case using sample template',
        },
      });

      expect(
        PathReporter.report(ConfigurationRequestRt.decode({ ...defaultRequest, templates }))[0]
      ).toContain(`The length of the field templates is too long. Array must be of length <= 10.`);
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('ConfigurationPatchRequestRt', () => {
    const defaultRequest = {
      connector: serviceNow,
      closure_type: 'close-by-user',
      version: 'WzQ3LDFd',
    };

    it('has expected attributes in request', () => {
      const query = ConfigurationPatchRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('has expected attributes in request with customFields', () => {
      const request = {
        ...defaultRequest,
        customFields: [
          {
            key: 'text_custom_field',
            label: 'Text custom field',
            type: CustomFieldTypes.TEXT,
            required: false,
          },
          {
            key: 'toggle_custom_field',
            label: 'Toggle custom field',
            type: CustomFieldTypes.TOGGLE,
            required: false,
          },
        ],
      };
      const query = ConfigurationPatchRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it(`limits customFields to ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
      const customFields = new Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
        key: 'text_custom_field',
        label: 'Text custom field',
        type: CustomFieldTypes.TEXT,
        required: false,
      });

      expect(
        PathReporter.report(
          ConfigurationPatchRequestRt.decode({ ...defaultRequest, customFields })
        )[0]
      ).toContain(
        `The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}`
      );
    });

    it('has expected attributes in request with templates', () => {
      const request = {
        ...defaultRequest,
        templates: [
          {
            key: 'template_key_1',
            name: 'Template 1',
            description: 'this is first template',
            tags: ['foo', 'bar'],
            caseFields: {
              title: 'case using sample template',
            },
          },
          {
            key: 'template_key_2',
            name: 'Template 2',
            description: 'this is second template',
            caseFields: null,
          },
        ],
      };
      const query = ConfigurationPatchRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it(`limits templates to ${MAX_TEMPLATES_LENGTH}`, () => {
      const templates = new Array(MAX_TEMPLATES_LENGTH + 1).fill({
        key: 'template_key_1',
        name: 'Template 1',
        description: 'this is first template',
        tags: [],
        caseFields: {
          title: 'case using sample template',
        },
      });

      expect(
        PathReporter.report(ConfigurationPatchRequestRt.decode({ ...defaultRequest, templates }))[0]
      ).toContain(`The length of the field templates is too long. Array must be of length <= 10.`);
    });

    it('has expected attributes in request with observableTypes', () => {
      const request = {
        ...defaultRequest,
        observableTypes: [
          {
            key: '371357ae-77ce-44bd-88b7-fbba9c80501f',
            label: 'Example Label',
          },
        ],
      };
      const query = ConfigurationPatchRequestRt.decode(request);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: request,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ConfigurationPatchRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('GetConfigurationFindRequestRt', () => {
    const defaultRequest = {
      owner: ['cases'],
    };

    it('has expected attributes in request', () => {
      const query = GetConfigurationFindRequestRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = GetConfigurationFindRequestRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CaseConfigureRequestParamsRt', () => {
    const defaultRequest = {
      configuration_id: 'basic-configuration-id',
    };

    it('has expected attributes in request', () => {
      const query = CaseConfigureRequestParamsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CaseConfigureRequestParamsRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });
  });

  describe('CustomFieldConfigurationWithoutTypeRt', () => {
    const defaultRequest = {
      key: 'custom_field_key',
      label: 'Custom field label',
      required: false,
    };

    it('has expected attributes in request', () => {
      const query = CustomFieldConfigurationWithoutTypeRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('limits key to 36 characters', () => {
      const longKey = 'x'.repeat(MAX_CUSTOM_FIELD_KEY_LENGTH + 1);

      expect(
        PathReporter.report(
          CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key: longKey })
        )
      ).toContain('The length of the key is too long. The maximum length is 36.');
    });

    it('returns an error if they key is not in the expected format', () => {
      const key = 'Not a proper key';

      expect(
        PathReporter.report(
          CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key })
        )
      ).toContain(`Key must be lower case, a-z, 0-9, '_', and '-' are allowed`);
    });

    it('accepts a uuid as a key', () => {
      const key = uuidv4();

      const query = CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, key },
      });
    });

    it('accepts a slug as a key', () => {
      const key = 'abc_key-1';

      const query = CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, key });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, key },
      });
    });

    it('limits label to 50 characters', () => {
      const longLabel = 'x'.repeat(MAX_CUSTOM_FIELD_LABEL_LENGTH + 1);

      expect(
        PathReporter.report(
          CustomFieldConfigurationWithoutTypeRt.decode({ ...defaultRequest, label: longLabel })
        )
      ).toContain('The length of the label is too long. The maximum length is 50.');
    });
  });

  describe('TextCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_text_custom_field',
      label: 'Text Custom Field',
      type: CustomFieldTypes.TEXT,
      required: true,
    };

    it('has expected attributes in request', () => {
      const query = TextCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('has expected attributes in request with defaultValue', () => {
      const query = TextCustomFieldConfigurationRt.decode({
        ...defaultRequest,
        defaultValue: 'foobar',
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, defaultValue: 'foobar' },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = TextCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('defaultValue fails if the type is not string', () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: false,
          })
        )[0]
      ).toContain('Invalid value false supplied');
    });

    it(`throws an error if the default value is longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: '#'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
          })
        )[0]
      ).toContain(
        `The length of the defaultValue is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
      );
    });

    it('throws an error if the default value is an empty string', () => {
      expect(
        PathReporter.report(
          TextCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: '',
          })
        )[0]
      ).toContain('The defaultValue field cannot be an empty string.');
    });
  });

  describe('ToggleCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_toggle_custom_field',
      label: 'Toggle Custom Field',
      type: CustomFieldTypes.TOGGLE,
      required: false,
    };

    it('has expected attributes in request', () => {
      const query = ToggleCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = ToggleCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('defaultValue fails if the type is not boolean', () => {
      expect(
        PathReporter.report(
          ToggleCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            required: true,
            defaultValue: 'foobar',
          })
        )[0]
      ).toContain('Invalid value "foobar" supplied');
    });
  });

  describe('NumberCustomFieldConfigurationRt', () => {
    const defaultRequest = {
      key: 'my_number_custom_field',
      label: 'Number Custom Field',
      type: CustomFieldTypes.NUMBER,
      required: true,
    };

    it('has expected attributes in request', () => {
      const query = NumberCustomFieldConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('has expected attributes in request with defaultValue', () => {
      const query = NumberCustomFieldConfigurationRt.decode({
        ...defaultRequest,
        defaultValue: 1,
      });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, defaultValue: 1 },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = NumberCustomFieldConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('defaultValue fails if the type is string', () => {
      expect(
        PathReporter.report(
          NumberCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: 'string',
          })
        )[0]
      ).toContain('Invalid value "string" supplied');
    });

    it('defaultValue fails if the type is boolean', () => {
      expect(
        PathReporter.report(
          NumberCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: false,
          })
        )[0]
      ).toContain('Invalid value false supplied');
    });

    it(`throws an error if the default value is more than  ${Number.MAX_SAFE_INTEGER}`, () => {
      expect(
        PathReporter.report(
          NumberCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: Number.MAX_SAFE_INTEGER + 1,
          })
        )[0]
      ).toContain(
        'The defaultValue field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      );
    });

    it(`throws an error if the default value is less than ${Number.MIN_SAFE_INTEGER}`, () => {
      expect(
        PathReporter.report(
          NumberCustomFieldConfigurationRt.decode({
            ...defaultRequest,
            defaultValue: Number.MIN_SAFE_INTEGER - 1,
          })
        )[0]
      ).toContain(
        'The defaultValue field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.'
      );
    });
  });

  describe('TemplateConfigurationRt', () => {
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
      const query = TemplateConfigurationRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = TemplateConfigurationRt.decode({ ...defaultRequest, foo: 'bar' });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest },
      });
    });

    it('limits key to 36 characters', () => {
      const longKey = 'x'.repeat(MAX_TEMPLATE_KEY_LENGTH + 1);

      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, key: longKey }))
      ).toContain('The length of the key is too long. The maximum length is 36.');
    });

    it('return error if key is empty', () => {
      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, key: '' }))
      ).toContain('The key field cannot be an empty string.');
    });

    it('returns an error if they key is not in the expected format', () => {
      const key = 'Not a proper key';

      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, key }))
      ).toContain(`Key must be lower case, a-z, 0-9, '_', and '-' are allowed`);
    });

    it('accepts a uuid as an key', () => {
      const key = uuidv4();

      const query = TemplateConfigurationRt.decode({ ...defaultRequest, key });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, key },
      });
    });

    it('accepts a slug as an key', () => {
      const key = 'abc_key-1';

      const query = TemplateConfigurationRt.decode({ ...defaultRequest, key });

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: { ...defaultRequest, key },
      });
    });

    it('does not throw when there is no description or tags', () => {
      const newRequest = {
        key: 'template_key_1',
        name: 'Template 1',
        caseFields: null,
      };

      expect(PathReporter.report(TemplateConfigurationRt.decode({ ...newRequest }))).toContain(
        'No errors!'
      );
    });

    it('limits name to 50 characters', () => {
      const longName = 'x'.repeat(MAX_TEMPLATE_NAME_LENGTH + 1);

      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, name: longName }))
      ).toContain('The length of the name is too long. The maximum length is 50.');
    });

    it('limits description to 1000 characters', () => {
      const longDesc = 'x'.repeat(MAX_TEMPLATE_DESCRIPTION_LENGTH + 1);

      expect(
        PathReporter.report(
          TemplateConfigurationRt.decode({ ...defaultRequest, description: longDesc })
        )
      ).toContain('The length of the description is too long. The maximum length is 1000.');
    });

    it(`throws an error when there are more than ${MAX_TAGS_PER_TEMPLATE} tags`, async () => {
      const tags = Array(MAX_TAGS_PER_TEMPLATE + 1).fill('foobar');

      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, tags }))
      ).toContain(
        `The length of the field template's tags is too long. Array must be of length <= 10.`
      );
    });

    it(`throws an error when the a tag is more than ${MAX_TEMPLATE_TAG_LENGTH} characters`, async () => {
      const tag = 'a'.repeat(MAX_TEMPLATE_TAG_LENGTH + 1);

      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, tags: [tag] }))
      ).toContain(`The length of the template's tag is too long. The maximum length is 50.`);
    });

    it(`throws an error when the a tag is empty string`, async () => {
      expect(
        PathReporter.report(TemplateConfigurationRt.decode({ ...defaultRequest, tags: [''] }))
      ).toContain(`The template's tag field cannot be an empty string.`);
    });

    describe('caseFields', () => {
      it('removes foo:bar attributes from caseFields', () => {
        const query = TemplateConfigurationRt.decode({
          ...defaultRequest,
          caseFields: { ...defaultRequest.caseFields, foo: 'bar' },
        });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: { ...defaultRequest },
        });
      });

      it('accepts caseFields as null', () => {
        const query = TemplateConfigurationRt.decode({
          ...defaultRequest,
          caseFields: null,
        });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: { ...defaultRequest, caseFields: null },
        });
      });

      it('accepts caseFields as {}', () => {
        const query = TemplateConfigurationRt.decode({
          ...defaultRequest,
          caseFields: {},
        });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: { ...defaultRequest, caseFields: {} },
        });
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

        const query = TemplateConfigurationRt.decode({
          ...defaultRequest,
          caseFields: caseFieldsAll,
        });

        expect(query).toStrictEqual({
          _tag: 'Right',
          right: { ...defaultRequest, caseFields: caseFieldsAll },
        });
      });

      it(`throws an error when the assignees are more than ${MAX_ASSIGNEES_PER_CASE}`, async () => {
        const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foobar' });

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, assignees },
            })
          )
        ).toContain(
          'The length of the field assignees is too long. Array must be of length <= 10.'
        );
      });

      it(`throws an error when the description contains more than ${MAX_DESCRIPTION_LENGTH} characters`, async () => {
        const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, description },
            })
          )
        ).toContain('The length of the description is too long. The maximum length is 30000.');
      });

      it(`throws an error when there are more than ${MAX_TAGS_PER_CASE} tags`, async () => {
        const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foobar');

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, tags },
            })
          )
        ).toContain('The length of the field tags is too long. Array must be of length <= 200.');
      });

      it(`throws an error when the tag is more than ${MAX_LENGTH_PER_TAG} characters`, async () => {
        const tag = 'a'.repeat(MAX_LENGTH_PER_TAG + 1);

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, tags: [tag] },
            })
          )
        ).toContain('The length of the tag is too long. The maximum length is 256.');
      });

      it(`throws an error when the title contains more than ${MAX_TITLE_LENGTH} characters`, async () => {
        const title = 'a'.repeat(MAX_TITLE_LENGTH + 1);

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, title },
            })
          )
        ).toContain('The length of the title is too long. The maximum length is 160.');
      });

      it(`throws an error when the category contains more than ${MAX_CATEGORY_LENGTH} characters`, async () => {
        const category = 'a'.repeat(MAX_CATEGORY_LENGTH + 1);

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, category },
            })
          )
        ).toContain('The length of the category is too long. The maximum length is 50.');
      });

      it(`limits customFields to ${MAX_CUSTOM_FIELDS_PER_CASE}`, () => {
        const customFields = Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
          key: 'first_custom_field_key',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value',
        });

        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
              ...defaultRequest,
              caseFields: { ...defaultRequest.caseFields, customFields },
            })
          )
        ).toContain(
          `The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}.`
        );
      });

      it(`throws an error when a text customFields is longer than ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}`, () => {
        expect(
          PathReporter.report(
            TemplateConfigurationRt.decode({
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
            })
          )
        ).toContain(
          `The length of the value is too long. The maximum length is ${MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH}.`
        );
      });
    });
  });

  describe('ObservableTypesConfigurationRt', () => {
    it('should validate a correct observable types configuration', () => {
      const validData = [
        { key: 'observable_key_1', label: 'Observable Label 1' },
        { key: 'observable_key_2', label: 'Observable Label 2' },
      ];

      const result = ObservableTypesConfigurationRt.decode(validData);
      expect(PathReporter.report(result).join()).toContain('No errors!');
    });

    it('should invalidate an observable types configuration with an invalid key', () => {
      const invalidData = [{ key: 'Invalid Key!', label: 'Observable Label 1' }];

      const result = ObservableTypesConfigurationRt.decode(invalidData);
      expect(PathReporter.report(result).join()).not.toContain('No errors!');
    });

    it('should invalidate an observable types configuration with a missing label', () => {
      const invalidData = [{ key: 'observable_key_1' }];

      const result = ObservableTypesConfigurationRt.decode(invalidData);
      expect(PathReporter.report(result).join()).not.toContain('No errors!');
    });

    it('should accept an observable types configuration with an empty array', () => {
      const invalidData: unknown[] = [];

      const result = ObservableTypesConfigurationRt.decode(invalidData);
      expect(PathReporter.report(result).join()).toContain('No errors!');
    });

    it('should invalidate an observable types configuration with a label exceeding max length', () => {
      const invalidData = [
        { key: 'observable_key_1', label: 'a'.repeat(MAX_OBSERVABLE_TYPE_LABEL_LENGTH + 1) },
      ];

      const result = ObservableTypesConfigurationRt.decode(invalidData);
      expect(PathReporter.report(result).join()).not.toContain('No errors!');
    });

    it('should invalidate an observable types configuration with a key exceeding max length', () => {
      const invalidData = [{ key: 'a'.repeat(MAX_OBSERVABLE_TYPE_KEY_LENGTH + 1), label: 'label' }];

      const result = ObservableTypesConfigurationRt.decode(invalidData);
      expect(PathReporter.report(result).join()).not.toContain('No errors!');
    });

    it('should invalidate an observable types configuration with observableTypes count exceeding max', () => {
      const invalidData = new Array(MAX_CUSTOM_OBSERVABLE_TYPES + 1).fill({
        key: 'foo',
        label: 'label',
      });

      const result = ObservableTypesConfigurationRt.decode(invalidData);
      expect(PathReporter.report(result).join()).not.toContain('No errors!');
    });

    it('accepts a uuid as an key', () => {
      const key = uuidv4();

      const query = ObservableTypesConfigurationRt.decode([{ key, label: 'Observable Label 1' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [{ key, label: 'Observable Label 1' }],
      });
    });

    it('accepts a slug as an key', () => {
      const key = 'abc_key-1';

      const query = ObservableTypesConfigurationRt.decode([{ key, label: 'Observable Label 1' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [{ key, label: 'Observable Label 1' }],
      });
    });
  });
});
