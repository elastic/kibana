/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes } from '../../../common/types/domain';
import {
  validateCustomFieldTypesInRequest,
  validateTemplatesCustomFieldsInRequest,
} from './validators';

describe('validators', () => {
  describe('validateCustomFieldTypesInRequest', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('throws an error with the keys of customFields in request that have invalid types', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE, label: 'label 1' },
            { key: '2', type: CustomFieldTypes.TEXT, label: 'label 2' },
          ],

          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid custom field types in request for the following labels: \\"label 1\\", \\"label 2\\""`
      );
    });

    it('throws an error when not all custom field types are invalid', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE, label: 'label 1' },
            { key: '2', type: CustomFieldTypes.TOGGLE, label: 'label 2' },
          ],

          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid custom field types in request for the following labels: \\"label 1\\""`
      );
    });

    it('does not throw if the request has no customFields', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          originalCustomFields: [
            { key: '1', type: CustomFieldTypes.TEXT },
            { key: '2', type: CustomFieldTypes.TOGGLE },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw if the current configuration has no customFields', () => {
      expect(() =>
        validateCustomFieldTypesInRequest({
          requestCustomFields: [
            { key: '1', type: CustomFieldTypes.TOGGLE, label: 'label 1' },
            { key: '2', type: CustomFieldTypes.TEXT, label: 'label 2' },
          ],
          originalCustomFields: [],
        })
      ).not.toThrow();
    });
  });

  describe('validateTemplatesCustomFieldsInRequest', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does not throw if all custom fields types in request match the configuration', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                  {
                    key: 'second_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                ],
              },
            },
            {
              key: 'template_key_2',
              name: 'second template',
              description: 'this is a second template value',
              caseFields: {
                title: 'Case title with template 2',
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                ],
              },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw if no custom fields are in request', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          customFieldsConfiguration: undefined,
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                tags: ['first-template'],
              },
            },
            {
              key: 'template_key_2',
              name: 'second template',
              description: 'this is a second template value',
              caseFields: null,
            },
          ],
        })
      ).not.toThrow();
    });

    it('does not throw if no configuration found but no templates are in request', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          customFieldsConfiguration: undefined,
          templates: [],
        })
      ).not.toThrow();
    });

    it('does not throw if the configuration is undefined but no custom fields are in request', () => {
      expect(() => validateTemplatesCustomFieldsInRequest({})).not.toThrow();
    });

    it('throws if configuration is missing and template has custom fields', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                ],
              },
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields configured."`);
    });

    it('throws if configuration has custom fields and template has no custom fields', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: null,
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"No custom fields added to template."`);
    });

    it('throws for a single invalid type', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                  {
                    key: 'second_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: true,
                  },
                ],
              },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'first label',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following custom fields have the wrong type in the request: \\"first label\\""`
      );
    });

    it('throws for multiple custom fields with invalid types', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                  {
                    key: 'second_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: true,
                  },
                  {
                    key: 'third_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'abc',
                  },
                ],
              },
            },
          ],

          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'first label',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TEXT,
              label: 'second label',
              required: false,
            },
            {
              key: 'third_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'third label',
              required: false,
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"The following custom fields have the wrong type in the request: \\"first label\\", \\"second label\\", \\"third label\\""`
      );
    });

    it('throws if there are invalid custom field keys', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                customFields: [
                  {
                    key: 'invalid_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                ],
              },
            },
          ],
          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid custom field keys: invalid_key"`);
    });

    it('throws if template has duplicated custom field keys', () => {
      expect(() =>
        validateTemplatesCustomFieldsInRequest({
          templates: [
            {
              key: 'template_key_1',
              name: 'first template',
              description: 'this is a first template value',
              caseFields: {
                customFields: [
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TEXT,
                    value: 'this is a text field value',
                  },
                  {
                    key: 'first_key',
                    type: CustomFieldTypes.TOGGLE,
                    value: null,
                  },
                ],
              },
            },
          ],

          customFieldsConfiguration: [
            {
              key: 'first_key',
              type: CustomFieldTypes.TEXT,
              label: 'foo',
              required: false,
            },
            {
              key: 'second_key',
              type: CustomFieldTypes.TOGGLE,
              label: 'foo',
              required: false,
            },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated templates[0]'s customFields keys in request: first_key"`
      );
    });
  });
});
