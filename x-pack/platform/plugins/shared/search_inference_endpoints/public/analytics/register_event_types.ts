/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/public';

import { EventType } from './event_tracker';

const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventType.ENDPOINT_CREATED,
    schema: {},
    // Emitted from InferenceFlyoutWrapper.onSubmitSuccess when an external inference
    // endpoint is successfully created via the add-endpoint flyout.
  },
  {
    eventType: EventType.ENDPOINT_EDITED,
    schema: {},
    // Emitted from InferenceFlyoutWrapper.onSubmitSuccess (edit mode) when an
    // existing inference endpoint's configuration is successfully saved.
  },
  {
    eventType: EventType.DEFAULT_MODEL_CHANGED,
    schema: {},
    // Emitted when the user picks a different default model in the feature-settings
    // combobox (fired on selection, not on save).
  },
  {
    eventType: EventType.FEATURE_SETTINGS_SAVED,
    schema: {},
    // Emitted when the user saves the feature-settings page via the Save button.
    // Fires after both feature assignments and default-model changes have been persisted.
  },
  {
    eventType: EventType.FILTER_APPLIED,
    schema: {
      filter: {
        type: 'keyword',
        _meta: {
          description:
            'Identifier of the multi-select filter popover the user changed. Value is the popover\'s dataTestSubj (e.g. "provider-type-select", "task-type-select"); "unknown" if the filter has no dataTestSubj.',
        },
      },
    },
    // Emitted when the user changes the selected options inside a MultiSelectFilter popover
    // on the inference endpoints list (once per onChange, regardless of how many options changed).
  },
  {
    eventType: EventType.GROUP_BY_CHANGED,
    schema: {
      group_by: {
        type: 'keyword',
        _meta: {
          description:
            'New grouping option selected on the inference-endpoints list. One of: "none", "model_id", "service".',
        },
      },
    },
    // Emitted when the user selects a different option in the Group-by popover.
  },
  {
    eventType: EventType.EMPTY_STATE_VIEWED,
    schema: {},
    // Emitted once per mount of ExternalInferenceEmptyPrompt (user has no external
    // inference endpoints configured). Impression signal, not a click.
  },
  {
    eventType: EventType.FLYOUT_OPENED,
    schema: {
      flyout: {
        type: 'keyword',
        _meta: {
          description:
            'Identifier of the flyout that opened. Allowed values: "add_inference" (add-endpoint flyout on the external inference page).',
        },
      },
    },
  },
  {
    eventType: EventType.FLYOUT_CLOSED,
    schema: {
      flyout: {
        type: 'keyword',
        _meta: {
          description: 'Identifier of the flyout that closed. Allowed values: "add_inference".',
        },
      },
    },
  },
  {
    eventType: EventType.MODAL_OPENED,
    schema: {
      modal: {
        type: 'keyword',
        _meta: {
          description:
            'Identifier of the modal that opened inside the model detail flyout. Allowed values: "add_endpoint", "edit_endpoint".',
        },
      },
    },
  },
  {
    eventType: EventType.MODAL_CLOSED,
    schema: {},
    // Emitted when the add/edit endpoint modal inside the model detail flyout is dismissed.
  },
  {
    eventType: EventType.EIS_MODEL_VIEWED,
    schema: {
      model_id: {
        type: 'keyword',
        _meta: {
          description:
            'Elastic Inference Service catalog model identifier shown in the model detail flyout (e.g. ".elser_model_2", "rainbow-sprinkles", ".multilingual-e5-small"). Only emitted for EIS-hosted models; never user-provided strings.',
        },
      },
    },
  },
];

export const registerSearchInferenceEndpointsEventTypes = (analytics: AnalyticsServiceSetup) => {
  for (const eventType of eventTypes) {
    analytics.registerEventType(eventType);
  }
};
