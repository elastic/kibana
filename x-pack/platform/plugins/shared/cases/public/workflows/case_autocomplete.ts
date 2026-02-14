/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, HttpStart } from '@kbn/core/public';
import type { PropertySelectionHandler, SelectionOption } from '@kbn/workflows';
import { CASE_CONFIGURE_URL, CASE_TAGS_URL } from '../../common/constants';
import { getAllConnectorsUrl } from '../../common/utils/connectors_api';
import * as i18n from './translations';

export interface ConnectorOption {
  id: string;
  name: string;
  actionTypeId?: string;
  type?: string;
}

interface TemplateCaseFieldsOption {
  category?: string | null;
  tags?: string[];
}

export interface TemplateOption {
  key: string;
  name?: string;
  description?: string;
  caseFields?: TemplateCaseFieldsOption | null;
  tags?: string[];
}

export interface CustomFieldConfigurationOption {
  key: string;
  label: string;
  type: string;
  required?: boolean;
}

interface CaseConfigurationOption {
  templates?: TemplateOption[];
  customFields?: CustomFieldConfigurationOption[];
  custom_fields?: CustomFieldConfigurationOption[];
}

export const createCasesWorkflowAutocompleteDataSources = (core: CoreSetup) => {
  let httpPromise: Promise<HttpStart> | null = null;

  const getHttp = async (): Promise<HttpStart> => {
    if (!httpPromise) {
      httpPromise = core.getStartServices().then(([coreStart]) => coreStart.http);
    }
    return httpPromise;
  };

  const getConnectors = async (): Promise<ConnectorOption[]> => {
    const http = await getHttp();
    return http.get<ConnectorOption[]>(getAllConnectorsUrl());
  };

  const getCaseConfigurations = async (): Promise<CaseConfigurationOption[]> => {
    const http = await getHttp();
    return http.get<CaseConfigurationOption[]>(CASE_CONFIGURE_URL);
  };

  const getTemplateOptions = async (): Promise<TemplateOption[]> => {
    const configurations = await getCaseConfigurations();
    const templates = configurations.flatMap((configuration) => configuration.templates ?? []);

    return Array.from(
      templates
        .reduce<Map<string, TemplateOption>>((map, template) => {
          if (!template.key) {
            return map;
          }
          if (!map.has(template.key)) {
            map.set(template.key, template);
          }
          return map;
        }, new Map())
        .values()
    );
  };

  const getCustomFieldOptions = async (): Promise<CustomFieldConfigurationOption[]> => {
    const configurations = await getCaseConfigurations();
    const customFields = configurations.flatMap(
      (configuration) => configuration.customFields ?? configuration.custom_fields ?? []
    );

    return Array.from(
      customFields
        .reduce<Map<string, CustomFieldConfigurationOption>>((map, customField) => {
          if (!customField.key) {
            return map;
          }
          if (!map.has(customField.key)) {
            map.set(customField.key, customField);
          }
          return map;
        }, new Map())
        .values()
    );
  };

  const getCategoryOptions = async (): Promise<string[]> => {
    const templates = await getTemplateOptions();
    return Array.from(
      new Set(
        templates
          .map((template) => template.caseFields?.category)
          .filter((category): category is string => Boolean(category))
      )
    );
  };

  const getTagOptions = async (): Promise<string[]> => {
    const [apiTags, templates] = await Promise.all([
      (async () => {
        const http = await getHttp();
        return http.get<string[]>(CASE_TAGS_URL);
      })(),
      getTemplateOptions(),
    ]);

    const templateTags = templates.flatMap((template) => [
      ...(template.tags ?? []),
      ...(template.caseFields?.tags ?? []),
    ]);

    return Array.from(new Set([...(apiTags ?? []), ...templateTags]));
  };

  return {
    getConnectors,
    getTemplateOptions,
    getCustomFieldOptions,
    getCategoryOptions,
    getTagOptions,
  };
};

export const buildEnumSelectionHandler = (
  values: string[],
  label: string
): PropertySelectionHandler<string> => ({
  search: async (input: string) => {
    const query = input.trim().toLowerCase();
    return values
      .filter((value) => query.length === 0 || value.toLowerCase().includes(query))
      .map((value) => ({ value, label: value }));
  },
  resolve: async (value: string) =>
    values.includes(value)
      ? {
          value,
          label: value,
        }
      : null,
  getDetails: async (value: string, _context: unknown, option: SelectionOption<string> | null) => {
    if (option) {
      return {
        message: i18n.ENUM_VALUE_SUPPORTED_MESSAGE(label, option.label),
      };
    }

    return {
      message: i18n.ENUM_VALUE_NOT_SUPPORTED_MESSAGE(label, value, values.join(', ')),
    };
  },
});

export const buildBooleanSelectionHandler = (label: string): PropertySelectionHandler<boolean> => ({
  search: async (input: string) => {
    const query = input.trim().toLowerCase();
    const options: Array<{ value: boolean; label: string; description: string }> = [
      { value: true, label: 'true', description: i18n.ENABLE_BOOLEAN_OPTION(label) },
      { value: false, label: 'false', description: i18n.DISABLE_BOOLEAN_OPTION(label) },
    ];
    return options.filter((option) => query.length === 0 || option.label.includes(query));
  },
  resolve: async (value: boolean) => ({
    value,
    label: String(value),
    description: value ? i18n.ENABLE_BOOLEAN_OPTION(label) : i18n.DISABLE_BOOLEAN_OPTION(label),
  }),
  getDetails: async (value: string) => ({
    message: i18n.BOOLEAN_SET_TO_MESSAGE(label, value),
  }),
});

export const buildConnectorSelectionHandler = (
  getConnectors: () => Promise<ConnectorOption[]>,
  valueKey: 'id' | 'name' | 'type'
): PropertySelectionHandler<string> => ({
  search: async (input: string) => {
    const connectors = await getConnectors();
    const query = input.trim().toLowerCase();
    return connectors
      .filter(
        (connector) =>
          query.length === 0 ||
          connector.id.toLowerCase().includes(query) ||
          connector.name.toLowerCase().includes(query) ||
          (connector.type ?? '').toLowerCase().includes(query)
      )
      .map((connector) => ({
        value: (connector[valueKey] ?? '') as string,
        label: connector.name,
        description: connector.actionTypeId
          ? i18n.CONNECTOR_ACTION_TYPE_DESCRIPTION(connector.actionTypeId)
          : undefined,
      }))
      .filter((option) => option.value.length > 0);
  },
  resolve: async (value: string) => {
    const connectors = await getConnectors();
    const connector = connectors.find((item) => item[valueKey] === value);

    if (!connector) {
      return null;
    }

    return {
      value: (connector[valueKey] ?? '') as string,
      label: connector.name,
      description: connector.actionTypeId
        ? i18n.CONNECTOR_ACTION_TYPE_DESCRIPTION(connector.actionTypeId)
        : undefined,
    };
  },
  getDetails: async (value: string, _context: unknown, option: SelectionOption<string> | null) => {
    if (option) {
      return {
        message: i18n.CONNECTOR_AVAILABLE_MESSAGE(option.label),
      };
    }

    return {
      message: i18n.CONNECTOR_NOT_FOUND_MESSAGE(value),
    };
  },
});

export const buildTemplateSelectionHandler = (
  getTemplateOptions: () => Promise<TemplateOption[]>
): PropertySelectionHandler<string> => ({
  search: async (input: string) => {
    const templates = await getTemplateOptions();
    const query = input.trim().toLowerCase();
    return templates
      .filter(
        (template) =>
          query.length === 0 ||
          template.key.toLowerCase().includes(query) ||
          (template.name ?? '').toLowerCase().includes(query)
      )
      .map((template) => ({
        value: template.key,
        label: template.name ?? template.key,
        description: template.description,
      }));
  },
  resolve: async (value: string) => {
    const templates = await getTemplateOptions();
    const templateOption = templates.find(
      (template) => template.key === value || template.name === value
    );

    if (!templateOption) {
      return null;
    }

    return {
      value: templateOption.key,
      label: templateOption.name ?? templateOption.key,
      description: templateOption.description,
    };
  },
  getDetails: async (value: string, _context: unknown, option: SelectionOption<string> | null) => {
    if (option) {
      return {
        message: i18n.TEMPLATE_CAN_BE_USED_MESSAGE(option.label),
      };
    }

    return {
      message: i18n.TEMPLATE_NOT_FOUND_MESSAGE(value),
    };
  },
});

export const buildCustomFieldKeySelectionHandler = (
  getCustomFieldOptions: () => Promise<CustomFieldConfigurationOption[]>
): PropertySelectionHandler<string> => ({
  search: async (input: string) => {
    const customFields = await getCustomFieldOptions();
    const query = input.trim().toLowerCase();
    return customFields
      .filter(
        (customField) =>
          query.length === 0 ||
          customField.key.toLowerCase().includes(query) ||
          customField.label.toLowerCase().includes(query)
      )
      .map((customField) => ({
        value: customField.key,
        label: customField.label,
        description: i18n.CUSTOM_FIELD_KEY_TYPE_DESCRIPTION(customField.key, customField.type),
      }));
  },
  resolve: async (value: string) => {
    const customFields = await getCustomFieldOptions();
    const customField = customFields.find((item) => item.key === value);

    if (!customField) {
      return null;
    }

    return {
      value: customField.key,
      label: customField.label,
      description: i18n.CUSTOM_FIELD_KEY_TYPE_DESCRIPTION(customField.key, customField.type),
    };
  },
  getDetails: async (value: string, _context: unknown, option: SelectionOption<string> | null) => {
    if (option) {
      return {
        message: i18n.CUSTOM_FIELD_AVAILABLE_MESSAGE(option.label),
      };
    }

    return {
      message: i18n.CUSTOM_FIELD_NOT_FOUND_MESSAGE(value),
    };
  },
});

export const buildCustomFieldTypeSelectionHandler = (
  getCustomFieldOptions: () => Promise<CustomFieldConfigurationOption[]>
): PropertySelectionHandler<string> => ({
  search: async (input: string) => {
    const customFields = await getCustomFieldOptions();
    const query = input.trim().toLowerCase();
    const typeToFieldCount = customFields.reduce<Record<string, number>>((acc, field) => {
      acc[field.type] = (acc[field.type] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(typeToFieldCount)
      .filter(([type]) => query.length === 0 || type.toLowerCase().includes(query))
      .map(([type, count]) => ({
        value: type,
        label: type,
        description: i18n.CUSTOM_FIELD_TYPE_USAGE_DESCRIPTION(count),
      }));
  },
  resolve: async (value: string) => ({
    value,
    label: value,
  }),
  getDetails: async (value: string) => ({
    message: i18n.CUSTOM_FIELD_TYPE_CAN_BE_USED_MESSAGE(value),
  }),
});

export const buildStringValueSelectionHandler = (
  getValues: () => Promise<string[]>,
  label: string
): PropertySelectionHandler<string> => ({
  search: async (input: string) => {
    const values = await getValues();
    const query = input.trim().toLowerCase();
    return values
      .filter((value) => query.length === 0 || value.toLowerCase().includes(query))
      .map((value) => ({
        value,
        label: value,
      }));
  },
  resolve: async (value: string) => {
    const values = await getValues();
    if (!values.includes(value)) {
      return null;
    }
    return { value, label: value };
  },
  getDetails: async (value: string, _context: unknown, option: SelectionOption<string> | null) => {
    if (option) {
      return {
        message: i18n.STRING_VALUE_AVAILABLE_MESSAGE(label, option.label),
      };
    }
    return {
      message: i18n.STRING_VALUE_NOT_IN_SUGGESTIONS_MESSAGE(label, value),
    };
  },
});
