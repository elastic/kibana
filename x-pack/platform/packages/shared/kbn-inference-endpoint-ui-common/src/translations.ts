/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getRequiredMessage = (field: string) => {
  return i18n.translate('xpack.inferenceEndpointUICommon.components.requiredGenericTextField', {
    defaultMessage: '{field} is required.',
    values: { field },
  });
};

export const INPUT_INVALID = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.params.error.invalidInputText',
  {
    defaultMessage: 'Input does not have a valid Array format.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);

export const BODY = i18n.translate('xpack.inferenceEndpointUICommon.components.bodyFieldLabel', {
  defaultMessage: 'Body',
});

export const INPUT = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.completionInputLabel',
  {
    defaultMessage: 'Input',
  }
);

export const INPUT_TYPE = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.completionInputTypeLabel',
  {
    defaultMessage: 'Input type',
  }
);

export const QUERY = i18n.translate('xpack.inferenceEndpointUICommon.components.rerankQueryLabel', {
  defaultMessage: 'Query',
});

export const BODY_DESCRIPTION = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.bodyCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const TASK_TYPE = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.taskTypeFieldLabel',
  {
    defaultMessage: 'Task type',
  }
);

export const PROVIDER = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.providerFieldLabel',
  {
    defaultMessage: 'Provider',
  }
);

export const PROVIDER_REQUIRED = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.error.requiredProviderText',
  {
    defaultMessage: 'Provider is required.',
  }
);

export const DOCUMENTATION = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.documentation',
  {
    defaultMessage: 'Inference API documentation',
  }
);

export const SELECT_PROVIDER = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.selectProvider',
  {
    defaultMessage: 'Select a service',
  }
);

export const COPY_TOOLTIP = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.copy.tooltip',
  {
    defaultMessage: 'Copy to clipboard',
  }
);

export const COPIED_TOOLTIP = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.copied.tooltip',
  {
    defaultMessage: 'Copied!',
  }
);

export const SEARCHLABEL = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.searchLabel',
  {
    defaultMessage: 'Search',
  }
);

export const OPTIONALTEXT = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.optionalText',
  {
    defaultMessage: 'Optional',
  }
);

export const LEARN_MORE = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.learnMoreText',
  {
    defaultMessage: 'Learn more.',
  }
);

export const RE_ENTER_SECRETS = (label: string) => {
  return i18n.translate('xpack.inferenceEndpointUICommon.components.requiredGenericTextField', {
    defaultMessage:
      'You will need to reenter your ${label} each time you edit the inference endpoint',
    values: { label },
  });
};

export const GET_PROVIDERS_FAILED = i18n.translate(
  'xpack.inferenceEndpointUICommon.hooks.unableToFindProvidersQueryMessage',
  {
    defaultMessage: 'Unable to find providers',
  }
);

export const ENDPOINT_TITLE = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.EndpointTitle',
  {
    defaultMessage: 'Inference Endpoint',
  }
);

export const CANCEL = i18n.translate('xpack.inferenceEndpointUICommon.components.cancelBtnLabel', {
  defaultMessage: 'Cancel',
});

export const SAVE = i18n.translate('xpack.inferenceEndpointUICommon.components.saveBtnLabel', {
  defaultMessage: 'Save',
});

export const ENDPOINT_ADDED_SUCCESS = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.endpointAddedSuccess',
  {
    defaultMessage: 'Inference endpoint added',
  }
);

export const ENDPOINT_CREATION_FAILED = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.endpointAddedFailure',
  {
    defaultMessage: 'Inference endpoint creation failed',
  }
);

export const ENDPOINT_UPDATE_SUCCESS = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.endpointUpdateSuccess',
  {
    defaultMessage: 'Inference endpoint updated successfully',
  }
);

export const ENDPOINT_UPDATE_FAILED = i18n.translate(
  'xpack.inferenceEndpointUICommon.components.endpointUpdateFailure',
  {
    defaultMessage: 'Inference endpoint update failed',
  }
);
