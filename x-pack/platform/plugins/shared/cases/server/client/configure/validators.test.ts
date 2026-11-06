/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CASE_STATUSES_PER_CATEGORY } from '../../../common/constants';
import { CaseStatuses, CustomFieldTypes } from '../../../common/types/domain';
import { getBuiltInStatuses } from '../../../common/utils/statuses';
import {
  validateCustomFieldTypesInRequest,
  validatePauseReasons,
  validateStatusesConfiguration,
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

  describe('validateStatusesConfiguration', () => {
    const builtIn = getBuiltInStatuses();
    const onHold = {
      key: 'on_hold',
      label: 'On hold',
      category: CaseStatuses['in-progress'],
      order: 3,
      isDefault: false,
      disabled: false,
    };
    const validate = (
      requestStatuses: Parameters<typeof validateStatusesConfiguration>[0]['requestStatuses'],
      originalStatuses = builtIn
    ) =>
      validateStatusesConfiguration({
        requestStatuses,
        originalStatuses,
        customStatusesEnabled: true,
      });

    it('does not throw when statuses are not in the request', () => {
      expect(() => validateStatusesConfiguration({ customStatusesEnabled: false })).not.toThrow();
    });

    it('does not throw for the built-in statuses plus a custom one', () => {
      expect(() => validate([...builtIn, onHold])).not.toThrow();
    });

    it('throws when custom statuses are disabled', () => {
      expect(() =>
        validateStatusesConfiguration({ requestStatuses: builtIn, customStatusesEnabled: false })
      ).toThrowErrorMatchingInlineSnapshot(`"Custom statuses are not enabled"`);
    });

    it('throws on duplicated keys', () => {
      expect(() =>
        validate([...builtIn, onHold, { ...onHold, label: 'Other' }])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated statuses keys in request: on_hold"`
      );
    });

    it('throws when a built-in status is missing', () => {
      expect(() =>
        validate(builtIn.filter((status) => status.key !== 'closed'))
      ).toThrowErrorMatchingInlineSnapshot(`"The built-in status \\"closed\\" is required"`);
    });

    it('throws when a built-in status is moved to another category', () => {
      expect(() =>
        validate(
          builtIn.map((status) =>
            status.key === 'closed' ? { ...status, category: CaseStatuses.open } : status
          ),
          []
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"The built-in status \\"closed\\" must belong to the \\"closed\\" category"`
      );
    });

    it(`throws when a category has more than ${MAX_CASE_STATUSES_PER_CATEGORY} statuses`, () => {
      const extra = Array.from({ length: MAX_CASE_STATUSES_PER_CATEGORY }, (_, index) => ({
        ...onHold,
        key: `on_hold_${index}`,
        label: `On hold ${index}`,
      }));

      expect(() => validate([...builtIn, ...extra])).toThrowErrorMatchingInlineSnapshot(
        `"The category \\"in-progress\\" can have at most 10 statuses"`
      );
    });

    it('throws on duplicated labels within a category regardless of case', () => {
      expect(() =>
        validate([...builtIn, onHold, { ...onHold, key: 'on_hold_2', label: ' ON HOLD ' }])
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid duplicated statuses labels in category \\"in-progress\\": on hold"`
      );
    });

    it('allows the same label in different categories', () => {
      expect(() =>
        validate([
          ...builtIn,
          onHold,
          { ...onHold, key: 'on_hold_closed', category: CaseStatuses.closed },
        ])
      ).not.toThrow();
    });

    it('throws when every status of a category is disabled', () => {
      expect(() =>
        validate(
          builtIn.map((status) =>
            status.key === 'closed' ? { ...status, disabled: true } : status
          )
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"The category \\"closed\\" needs at least one enabled status"`
      );
    });

    it('throws when a category has no default status', () => {
      expect(() =>
        validate(
          builtIn.map((status) =>
            status.key === 'open' ? { ...status, isDefault: false } : status
          )
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"The category \\"open\\" must have exactly one default status"`
      );
    });

    it('throws when a category has two default statuses', () => {
      expect(() =>
        validate([...builtIn, { ...onHold, isDefault: true }])
      ).toThrowErrorMatchingInlineSnapshot(
        `"The category \\"in-progress\\" must have exactly one default status"`
      );
    });

    it('throws when the default status is disabled', () => {
      expect(() =>
        validate([
          ...builtIn.map((status) =>
            status.key === 'in-progress' ? { ...status, disabled: true } : status
          ),
          onHold,
        ])
      ).toThrowErrorMatchingInlineSnapshot(
        `"The default status of the category \\"in-progress\\" cannot be disabled"`
      );
    });

    it('throws when an existing status is removed', () => {
      expect(() => validate(builtIn, [...builtIn, onHold])).toThrowErrorMatchingInlineSnapshot(
        `"The status \\"on_hold\\" cannot be removed, disable it instead"`
      );
    });

    it('throws when the category of an existing status changes', () => {
      expect(() =>
        validate([...builtIn, { ...onHold, category: CaseStatuses.open }], [...builtIn, onHold])
      ).toThrowErrorMatchingInlineSnapshot(
        `"The category of the status \\"on_hold\\" cannot be changed"`
      );
    });

    describe('pausing statuses', () => {
      it('allows a pausing status in the open and in-progress categories', () => {
        expect(() =>
          validate([
            ...builtIn,
            { ...onHold, pausesTimeTracking: true },
            {
              ...onHold,
              key: 'awaiting_triage',
              label: 'Awaiting triage',
              category: CaseStatuses.open,
              pausesTimeTracking: true,
            },
          ])
        ).not.toThrow();
      });

      it('throws when a closed status pauses time tracking', () => {
        expect(() =>
          validate([
            ...builtIn,
            { ...onHold, key: 'parked', category: CaseStatuses.closed, pausesTimeTracking: true },
          ])
        ).toThrowErrorMatchingInlineSnapshot(
          `"The status \\"parked\\" cannot pause time tracking: only statuses in the \\"open\\" and \\"in-progress\\" categories can"`
        );
      });

      it('throws when the default status pauses time tracking', () => {
        expect(() =>
          validate(
            builtIn.map((status) =>
              status.key === 'in-progress' ? { ...status, pausesTimeTracking: true } : status
            )
          )
        ).toThrowErrorMatchingInlineSnapshot(
          `"The default status of the category \\"in-progress\\" cannot pause time tracking"`
        );
      });
    });
  });

  describe('validatePauseReasons', () => {
    const pausing = {
      key: 'on_hold',
      label: 'On hold',
      category: CaseStatuses['in-progress'],
      order: 3,
      isDefault: false,
      disabled: false,
      pausesTimeTracking: true,
    };
    const statuses = [...getBuiltInStatuses(), pausing];

    it('does not throw when the reasons are not part of the persisted values', () => {
      expect(() => validatePauseReasons({ customStatusesEnabled: true })).not.toThrow();
      expect(() => validatePauseReasons({ customStatusesEnabled: false })).not.toThrow();
    });

    it('throws when reasons are sent while custom statuses are disabled', () => {
      expect(() =>
        validatePauseReasons({ requestPauseReasons: ['Waiting'], customStatusesEnabled: false })
      ).toThrowErrorMatchingInlineSnapshot(`"Custom statuses are not enabled"`);
    });

    it('throws on duplicated reasons regardless of case and spacing', () => {
      expect(() =>
        validatePauseReasons({
          pauseReasons: ['Awaiting customer', ' awaiting CUSTOMER '],
          statuses,
          customStatusesEnabled: true,
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid duplicated pause reasons: awaiting customer"`);
    });

    it('throws when the list is empty while an enabled status pauses time tracking', () => {
      expect(() =>
        validatePauseReasons({ pauseReasons: [], statuses, customStatusesEnabled: true })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Add at least one pause reason when a status pauses time tracking"`
      );
    });

    it('allows an empty list when the only pausing status is disabled', () => {
      expect(() =>
        validatePauseReasons({
          pauseReasons: [],
          statuses: [...getBuiltInStatuses(), { ...pausing, disabled: true }],
          customStatusesEnabled: true,
        })
      ).not.toThrow();
    });

    it('allows an empty list when no status pauses time tracking', () => {
      expect(() =>
        validatePauseReasons({
          pauseReasons: [],
          statuses: getBuiltInStatuses(),
          customStatusesEnabled: true,
        })
      ).not.toThrow();
    });
  });
});
