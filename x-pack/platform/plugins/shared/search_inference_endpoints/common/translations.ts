/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.searchInferenceEndpoints.cancel', {
  defaultMessage: 'Cancel',
});

export const MANAGE_INFERENCE_ENDPOINTS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.allInferenceEndpoints.description',
  {
    defaultMessage:
      'Inference endpoints streamline the deployment and management of machine\nlearning models in Elasticsearch. Set up and manage NLP tasks using unique\nendpoints, to build AI-powered search.',
  }
);

export const VIEW_YOUR_MODELS_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.viewYourModels',
  {
    defaultMessage: 'ML Trained Models',
  }
);

export const EIS_DOCUMENTATION_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.eisDocumentationLink',
  {
    defaultMessage: 'Elastic Inference Service',
  }
);

export const API_DOCUMENTATION_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.apiDocumentationLink',
  {
    defaultMessage: 'API Documentation',
  }
);

export const ADD_ENDPOINT_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.addConnectorButtonLabel',
  {
    defaultMessage: 'Add endpoint',
  }
);

export const ENDPOINT = i18n.translate('xpack.searchInferenceEndpoints.endpoint', {
  defaultMessage: 'Endpoint',
});

export const MODEL = i18n.translate('xpack.searchInferenceEndpoints.model', {
  defaultMessage: 'Model',
});

export const SERVICE_PROVIDER = i18n.translate('xpack.searchInferenceEndpoints.serviceProvider', {
  defaultMessage: 'Service',
});

export const SERVICE_PROVIDER_ARIA_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.serviceProvider.ariaLabel',
  {
    defaultMessage: 'Service Provider Options',
  }
);

export const TASK_TYPE = i18n.translate('xpack.searchInferenceEndpoints.taskType', {
  defaultMessage: 'Type',
});
export const TASK_TYPE_ARIA_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.taskType.ariaLabel',
  {
    defaultMessage: 'Task Type Options',
  }
);

export const BREADCRUMB_RELEVANCE = i18n.translate(
  'xpack.searchInferenceEndpoints.breadcrumbs.relevance',
  {
    defaultMessage: 'Relevance',
  }
);

export const BREADCRUMB_INFERENCE_ENDPOINTS = i18n.translate(
  'xpack.searchInferenceEndpoints.breadcrumbs.inferenceEndpoints',
  {
    defaultMessage: 'Inference endpoints',
  }
);

export const ENDPOINT_COPY_SUCCESS = (inferenceId: string) =>
  i18n.translate('xpack.searchInferenceEndpoints.actions.copyIDSuccess', {
    defaultMessage: 'Inference endpoint ID {inferenceId} copied',
    values: { inferenceId },
  });

export const ENDPOINT_COPY_ID_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.copyID',
  {
    defaultMessage: 'Copy endpoint ID',
  }
);

export const ENDPOINT_DELETE_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.deleteEndpoint',
  {
    defaultMessage: 'Delete endpoint',
  }
);

export const ENDPOINT_VIEW_ACTION_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.actions.viewEndpooint',
  {
    defaultMessage: 'View endpoint',
  }
);

export const INFERENCE_ENDPOINTS_TABLE_CAPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.table.caption',
  {
    defaultMessage: 'Inference endpoints table',
  }
);

export const EMPTY_FILTER_MESSAGE = i18n.translate(
  'xpack.searchInferenceEndpoints.filter.emptyMessage',
  {
    defaultMessage: 'No options',
  }
);

export const GROUP_BY_NONE = i18n.translate(
  'xpack.searchInferenceEndpoints.groupBy.options.none.label',
  {
    defaultMessage: 'None',
  }
);

export const GROUP_BY_MODELS = i18n.translate(
  'xpack.searchInferenceEndpoints.groupBy.options.models.label',
  {
    defaultMessage: 'Model Author',
  }
);

export const GROUP_BY_SERVICE = i18n.translate(
  'xpack.searchInferenceEndpoints.groupBy.options.service.label',
  {
    defaultMessage: 'Service',
  }
);

export const TOKEN_BASED_BILLING_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.elastic.description',
  {
    defaultMessage: 'Runs on GPUs (token-based billing)',
  }
);

export const RESOURCE_BASED_BILLING_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.elasticsearch.description',
  {
    defaultMessage: 'Runs on ML Nodes (resource-based billing)',
  }
);

export const SETTINGS_TITLE = i18n.translate('xpack.searchInferenceEndpoints.settings.title', {
  defaultMessage: 'Settings',
});

export const SETTINGS_SAVE_BUTTON = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.saveButton',
  {
    defaultMessage: 'Save settings',
  }
);

export const SETTINGS_RESET_DEFAULTS = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.resetDefaults',
  {
    defaultMessage: 'Reset all to defaults',
  }
);

export const SETTINGS_ASSIGNED_MODELS = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.assignedModels',
  {
    defaultMessage: 'Assigned models',
  }
);

export const SETTINGS_DEFAULT_BADGE = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultBadge',
  {
    defaultMessage: 'Default',
  }
);

export const SETTINGS_NO_FEATURES_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.noFeatures.title',
  {
    defaultMessage: 'No features registered',
  }
);

export const SETTINGS_NO_FEATURES_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.noFeatures.description',
  {
    defaultMessage: 'No features have been registered for inference settings in this project.',
  }
);

export const DEFAULT_MODEL_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.title',
  {
    defaultMessage: 'Default model',
  }
);

export const DEFAULT_MODEL_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.description',
  {
    defaultMessage:
      'Choose a default model for all AI features. Individual features can override this with their own model.',
  }
);

export const DEFAULT_MODEL_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.label',
  {
    defaultMessage: 'Default model',
  }
);

export const DEFAULT_MODEL_PLACEHOLDER = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.placeholder',
  {
    defaultMessage: 'Select a default model',
  }
);

export const DEFAULT_MODEL_NO_DEFAULT_OPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.noDefault',
  {
    defaultMessage: 'No default model',
  }
);

export const DEFAULT_MODEL_PRECONFIGURED_GROUP = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.preconfiguredGroup',
  {
    defaultMessage: 'Pre-configured',
  }
);

export const DEFAULT_MODEL_CUSTOM_GROUP = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.customGroup',
  {
    defaultMessage: 'Custom connectors',
  }
);

export const DISALLOW_OTHER_MODELS_LABEL = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.disallowOtherModels',
  {
    defaultMessage: 'Only allow the default model to be used.',
  }
);

export const DISALLOW_OTHER_MODELS_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.disallowOtherModels.description',
  {
    defaultMessage: 'Model selection is hidden and only the default model will be used.',
  }
);

export const ALLOW_OTHER_MODELS_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.allowOtherModels.description',
  {
    defaultMessage: 'Features can allow users to select other models than the default.',
  }
);

export const DEFAULT_MODEL_CONNECTOR_NOT_EXIST_ERROR = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.error.connectorNotExist',
  {
    defaultMessage:
      'The model previously selected is not available. Please select a different option.',
  }
);

export const DEFAULT_MODEL_DISALLOW_NO_DEFAULT_ERROR = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.error.disallowNoDefault',
  {
    defaultMessage: 'When disallowing all other models, a default model must be selected.',
  }
);

export const DEFAULT_MODEL_SAVE_SUCCESS = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.saveSuccess',
  {
    defaultMessage: 'Default model settings saved',
  }
);

export const DEFAULT_MODEL_SAVE_ERROR = i18n.translate(
  'xpack.searchInferenceEndpoints.settings.defaultModel.saveError',
  {
    defaultMessage: 'Failed to save default model settings',
  }
);

export const EXTERNAL_INFERENCE_EMPTY_TITLE = i18n.translate(
  'xpack.searchInferenceEndpoints.externalInference.emptyTitle',
  {
    defaultMessage: 'Connect to external model providers',
  }
);

export const EXTERNAL_INFERENCE_EMPTY_DESCRIPTION = i18n.translate(
  'xpack.searchInferenceEndpoints.externalInference.emptyDescription',
  {
    defaultMessage:
      'Add model endpoints from your favorite model providers to use them for AI-powered search.',
  }
);

export const VIEW_DOCUMENTATION_LINK = i18n.translate(
  'xpack.searchInferenceEndpoints.providerInference.viewDocumentation',
  {
    defaultMessage: 'View documentation',
  }
);
