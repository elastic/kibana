/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  MAX_CATALOG_LENGTH,
  MAX_LABEL_NAME_LENGTH,
  MAX_LABELS,
  MAX_SECRET_LENGTH,
  MAX_TARGET_ID_LENGTH,
  MAX_WEBHOOK_URL_LENGTH,
} from '@kbn/connector-schemas/rootly_alerts/constants';

export const WEBHOOK_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.webhookUrlTextFieldLabel',
  {
    defaultMessage: 'Webhook URL',
  }
);

export const WEBHOOK_URL_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.webhookUrlHelpText',
  {
    defaultMessage: 'The webhook URL of the alert source in Rootly, without the secret.',
  }
);

export const WEBHOOK_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.invalidWebhookUrlText',
  {
    defaultMessage: 'Webhook URL is invalid.',
  }
);

export const WEBHOOK_URL_HAS_SECRET = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.secretInWebhookUrlText',
  {
    defaultMessage: 'Remove the secret from the URL and enter it in the Secret field.',
  }
);

export const WEBHOOK_URL_TOO_LONG = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.webhookUrlTooLongText',
  {
    defaultMessage: 'Webhook URL must be {maxLength, number} characters or fewer.',
    values: { maxLength: MAX_WEBHOOK_URL_LENGTH },
  }
);

export const SECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.secretTextFieldLabel',
  {
    defaultMessage: 'Secret',
  }
);

export const SECRET_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.secretHelpText',
  {
    defaultMessage: 'The secret of the alert source in Rootly.',
  }
);

export const SECRET_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.requiredSecretText',
  {
    defaultMessage: 'Secret is required.',
  }
);

export const SECRET_TOO_LONG = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.secretTooLongText',
  {
    defaultMessage: 'Secret must be {maxLength, number} characters or fewer.',
    values: { maxLength: MAX_SECRET_LENGTH },
  }
);

export const OPTIONAL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);

export const EVENT_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.eventSelectFieldLabel',
  {
    defaultMessage: 'Event',
  }
);

export const EVENT_TRIGGER_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.eventSelectTriggerOptionLabel',
  {
    defaultMessage: 'Trigger',
  }
);

export const EVENT_RESOLVE_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.eventSelectResolveOptionLabel',
  {
    defaultMessage: 'Resolve',
  }
);

export const DEDUP_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.dedupKeyTextFieldLabel',
  {
    defaultMessage: 'Deduplication key',
  }
);

export const DEDUP_KEY_RESOLVE_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.dedupKeyResolveHelpText',
  {
    defaultMessage: 'Enter the key used to trigger the alert.',
  }
);

export const DEDUP_KEY_TRIGGER_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.dedupKeyTriggerHelpText',
  {
    defaultMessage: 'Use the same key to trigger and resolve an alert.',
  }
);

export const TITLE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.titleFieldLabel',
  {
    defaultMessage: 'Title',
  }
);

export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.descriptionFieldLabel',
  {
    defaultMessage: 'Description',
  }
);

export const LINK_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.linkFieldLabel',
  {
    defaultMessage: 'Link',
  }
);

export const URGENCY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.urgencyFieldLabel',
  {
    defaultMessage: 'Urgency',
  }
);

export const URGENCY_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.urgencyHelpText',
  {
    defaultMessage:
      'The name of a Rootly alert urgency. If empty, Rootly uses the default urgency of the alert source.',
  }
);

export const PAGING_TITLE = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.pagingSectionTitle',
  {
    defaultMessage: 'Paging',
  }
);

export const PAGING_ROUTES_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.pagingRoutesOptionLabel',
  {
    defaultMessage: 'Use alert routes',
  }
);

export const PAGING_TARGET_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.pagingTargetOptionLabel',
  {
    defaultMessage: 'Page a specific target',
  }
);

export const PAGING_ROUTES_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.pagingRoutesDescription',
  {
    defaultMessage: "Rootly uses this alert source's routes to decide who is paged.",
  }
);

export const PAGING_TARGET_DESCRIPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.pagingTargetDescription',
  {
    defaultMessage: "Enter the target's Rootly ID to page it directly, bypassing alert routes.",
  }
);

export const TARGET_TYPE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetTypeSelectFieldLabel',
  {
    defaultMessage: 'Target type',
  }
);

export const TARGET_TYPE_SERVICE_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetTypeSelectServiceOptionLabel',
  {
    defaultMessage: 'Service',
  }
);

export const TARGET_TYPE_TEAM_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetTypeSelectTeamOptionLabel',
  {
    defaultMessage: 'Team',
  }
);

export const TARGET_TYPE_ESCALATION_POLICY_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetTypeSelectEscalationPolicyOptionLabel',
  {
    defaultMessage: 'Escalation policy',
  }
);

export const TARGET_TYPE_USER_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetTypeSelectUserOptionLabel',
  {
    defaultMessage: 'User',
  }
);

export const TARGET_TYPE_FUNCTIONALITY_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetTypeSelectFunctionalityOptionLabel',
  {
    defaultMessage: 'Functionality',
  }
);

export const TARGET_ID_SERVICE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetIdServiceFieldLabel',
  {
    defaultMessage: 'Rootly service ID',
  }
);

export const TARGET_ID_TEAM_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetIdTeamFieldLabel',
  {
    defaultMessage: 'Rootly team ID',
  }
);

export const TARGET_ID_ESCALATION_POLICY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetIdEscalationPolicyFieldLabel',
  {
    defaultMessage: 'Rootly escalation policy ID',
  }
);

export const TARGET_ID_USER_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetIdUserFieldLabel',
  {
    defaultMessage: 'Rootly user ID',
  }
);

export const TARGET_ID_FUNCTIONALITY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.targetIdFunctionalityFieldLabel',
  {
    defaultMessage: 'Rootly functionality ID',
  }
);

export const ROUTING_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.routingFieldSelectFieldLabel',
  {
    defaultMessage: 'Routing field',
  }
);

export const MATCH_ON_SERVICE_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.matchOnSelectServiceOptionLabel',
  {
    defaultMessage: 'Service',
  }
);

export const MATCH_ON_TEAM_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.matchOnSelectTeamOptionLabel',
  {
    defaultMessage: 'Team',
  }
);

export const MATCH_ON_FUNCTIONALITY_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.matchOnSelectFunctionalityOptionLabel',
  {
    defaultMessage: 'Functionality',
  }
);

export const MATCH_ON_CATALOG_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.matchOnSelectCatalogOptionLabel',
  {
    defaultMessage: 'Custom catalog',
  }
);

export const MATCH_ON_CUSTOM_OPTION = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.matchOnSelectCustomOptionLabel',
  {
    defaultMessage: 'Custom value',
  }
);

export const CATALOG_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.catalogFieldLabel',
  {
    defaultMessage: 'Catalog slug',
  }
);

export const CATALOG_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.catalogHelpText',
  {
    defaultMessage: "Enter the catalog's slug in Rootly, for example, regions.",
  }
);

export const ROUTING_VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.routingValueFieldLabel',
  {
    defaultMessage: 'Routing value',
  }
);

export const ROUTING_VALUE_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.routingValueHelpText',
  {
    defaultMessage: 'Enter the value your Rootly alert route is configured to match.',
  }
);

export const ROUTING_VALUE_CUSTOM_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.routingValueCustomHelpText',
  {
    defaultMessage: 'Configure your Rootly alert route to match this value at $.routing_key.',
  }
);

export const LABELS_TITLE = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.labelsSectionTitle',
  {
    defaultMessage: 'Labels',
  }
);

export const LABELS_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.labelsSectionHelpText',
  {
    defaultMessage: 'Labels are not applied when using a generic webhook alert source.',
  }
);

export const LABEL_NAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.labelNameFieldLabel',
  {
    defaultMessage: 'Name',
  }
);

export const LABEL_VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.labelValueFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const LABEL_REMOVE_ARIA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.labelRemoveAriaLabel',
  {
    defaultMessage: 'Remove label',
  }
);

export const LABEL_ADD_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.labelAddButtonLabel',
  {
    defaultMessage: 'Add label',
  }
);

export const CUSTOM_DETAILS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.customDetailsFieldLabel',
  {
    defaultMessage: 'Custom details',
  }
);

export const CUSTOM_DETAILS_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.customDetailsHelpText',
  {
    defaultMessage: 'Additional alert data as a JSON object.',
  }
);

export const PREVIEW_TITLE = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.previewSectionTitle',
  {
    defaultMessage: 'Payload preview',
  }
);

export const PREVIEW_HELP = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.previewHelpText',
  {
    defaultMessage: 'Rule variables are replaced when the action runs.',
  }
);

export const PREVIEW_GENERATED_DEDUP_KEY = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.previewGeneratedDedupKey',
  {
    defaultMessage: '(generated)',
  }
);

export const PREVIEW_INVALID = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.previewInvalidText',
  {
    defaultMessage: 'Custom details must be a valid JSON object.',
  }
);

export const TITLE_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.requiredTitleText',
  {
    defaultMessage: 'Title is required.',
  }
);

export const DEDUP_KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.requiredDedupKeyText',
  {
    defaultMessage: 'Deduplication key is required.',
  }
);

export const CATALOG_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.requiredCatalogText',
  {
    defaultMessage: 'Catalog slug is required.',
  }
);

export const TARGET_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.requiredTargetIdText',
  {
    defaultMessage: 'Rootly ID is required.',
  }
);

export const CUSTOM_DETAILS_INVALID = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.invalidCustomDetails',
  {
    defaultMessage: 'Custom details must be a valid JSON object.',
  }
);

export const LABEL_NAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.requiredLabelNameText',
  {
    defaultMessage: 'Label name is required.',
  }
);

export const LABEL_NAME_DUPLICATE = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.duplicateLabelNameText',
  {
    defaultMessage: 'Label names must be unique.',
  }
);

export const CATALOG_TOO_LONG = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.catalogTooLongText',
  {
    defaultMessage: 'Catalog slug must be {maxLength, number} characters or fewer.',
    values: { maxLength: MAX_CATALOG_LENGTH },
  }
);

export const TARGET_ID_TOO_LONG = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.targetIdTooLongText',
  {
    defaultMessage: 'Rootly ID must be {maxLength, number} characters or fewer.',
    values: { maxLength: MAX_TARGET_ID_LENGTH },
  }
);

export const LABEL_NAME_TOO_LONG = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.labelNameTooLongText',
  {
    defaultMessage: 'Label names must be {maxLength, number} characters or fewer.',
    values: { maxLength: MAX_LABEL_NAME_LENGTH },
  }
);

export const LABELS_TOO_MANY = i18n.translate(
  'xpack.stackConnectors.components.rootlyAlerts.error.tooManyLabelsText',
  {
    defaultMessage: 'Add no more than {maxLabels} labels.',
    values: { maxLabels: MAX_LABELS },
  }
);
