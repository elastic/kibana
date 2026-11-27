/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ActionSourceTypes, type ActionSourceType } from '../../../common/types/domain';

export * from '../case_view/translations';

export const ALREADY_PUSHED_TO_SERVICE = (externalService: string) =>
  i18n.translate('xpack.cases.caseView.alreadyPushedToExternalService', {
    values: { externalService },
    defaultMessage: 'Already pushed to { externalService } incident',
  });

export const REQUIRED_UPDATE_TO_SERVICE = (externalService: string) =>
  i18n.translate('xpack.cases.caseView.requiredUpdateToExternalService', {
    values: { externalService },
    defaultMessage: 'Requires update to { externalService } incident',
  });

export const COPY_REFERENCE_LINK = i18n.translate('xpack.cases.caseView.copyCommentLinkAria', {
  defaultMessage: 'Copy reference link',
});

export const MOVE_TO_ORIGINAL_COMMENT = i18n.translate('xpack.cases.caseView.moveToCommentAria', {
  defaultMessage: 'Highlight the referenced comment',
});

export const CANCEL_BUTTON = i18n.translate('xpack.cases.caseView.delete.cancel', {
  defaultMessage: 'Cancel',
});

export const DELETE = i18n.translate('xpack.cases.caseView.delete.confirm', {
  defaultMessage: 'Delete',
});

export const ASSIGNED = i18n.translate('xpack.cases.caseView.assigned', {
  defaultMessage: 'assigned',
});

export const UNASSIGNED = i18n.translate('xpack.cases.caseView.unAssigned', {
  defaultMessage: 'unassigned',
});

export const THEMSELVES = i18n.translate('xpack.cases.caseView.assignee.themselves', {
  defaultMessage: 'themselves',
});

export const AND = i18n.translate('xpack.cases.caseView.assignee.and', {
  defaultMessage: 'and',
});

export const UNSAVED_DRAFT_DESCRIPTION = i18n.translate(
  'xpack.cases.caseView.description.unsavedDraftDescription',
  {
    defaultMessage: 'You have unsaved edits for the description',
  }
);

export const RESUME_EDITING_DESCRIPTION = i18n.translate(
  'xpack.cases.caseView.description.resumeEditing',
  {
    defaultMessage: 'Resume editing',
  }
);

export const CREATE_CASE = i18n.translate('xpack.cases.caseView.userActions.createCase', {
  defaultMessage: 'Created case',
});

export const CASE_INITIATED = i18n.translate('xpack.cases.caseView.userActions.caseInitiated', {
  defaultMessage: 'Case initiated',
});

export const CASE_DELETED = i18n.translate('xpack.cases.caseView.userActions.caseDeleted', {
  defaultMessage: `Case deleted`,
});

export const SEVERITY = i18n.translate('xpack.cases.caseView.userActions.severity', {
  defaultMessage: 'Severity',
});

export const TITLE = i18n.translate('xpack.cases.caseView.userActions..title', {
  defaultMessage: 'Title',
});

export const SETTING = i18n.translate('xpack.cases.caseView.userActions..settings', {
  defaultMessage: 'Settings',
});

export const CUSTOM_FIELDS = i18n.translate('xpack.cases.caseView.userActions.customFields', {
  defaultMessage: 'Custom Fields',
});

export const OBSERVABLES = i18n.translate('xpack.cases.caseView.userActions.observables', {
  defaultMessage: 'Observables',
});

export const USER_ACTION_EDITED = (type: string) =>
  i18n.translate('xpack.cases.caseView.userActions.edited', {
    values: { type },
    defaultMessage: `Edited "{type}"`,
  });

export const UPDATED_TEMPLATE_FIELDS = i18n.translate(
  'xpack.cases.caseView.userActions.updatedTemplateFields',
  {
    defaultMessage: 'updated template fields',
  }
);

export const SET_TEMPLATE_FIELD_LABEL = (fieldName: string, value: string) =>
  i18n.translate('xpack.cases.caseView.userActions.setTemplateFieldLabel', {
    defaultMessage: 'set {fieldName} to {value}',
    values: { fieldName, value },
  });

export const SET_TEMPLATE_FIELD_LABEL_PREFIX = (fieldName: string) =>
  i18n.translate('xpack.cases.caseView.userActions.setTemplateFieldLabelPrefix', {
    defaultMessage: 'set {fieldName} to',
    values: { fieldName },
  });

export const EXTENDED_FIELDS = i18n.translate('xpack.cases.caseView.userActions.extendedFields', {
  defaultMessage: 'Template Fields',
});

export const APPLIED_TEMPLATE = i18n.translate('xpack.cases.caseView.userActions.appliedTemplate', {
  defaultMessage: 'Applied Template',
});

export const APPLIED_TEMPLATE_LABEL = i18n.translate(
  'xpack.cases.caseView.userActions.appliedTemplateLabel',
  { defaultMessage: 'applied template' }
);

export const APPLIED_NAMED_TEMPLATE_LABEL = (name: string) =>
  i18n.translate('xpack.cases.caseView.userActions.appliedNamedTemplateLabel', {
    values: { name },
    defaultMessage: 'applied {name} template',
  });

export const REMOVED_TEMPLATE_LABEL = i18n.translate(
  'xpack.cases.caseView.userActions.removedTemplateLabel',
  { defaultMessage: 'removed applied template' }
);

export const SYNCED_ALERTS_WITH_CLOSE_REASON = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.status.syncedAlertsWithCloseReason', {
    values: { count },
    defaultMessage: 'and synced {count, plural, =1 {# alert} other {# alerts}} with close reason',
  });

export const WORKFLOW_RAN = i18n.translate('xpack.cases.caseView.userActions.workflowRan', {
  defaultMessage: 'ran a workflow',
});

export const MERGED_CASES = i18n.translate('xpack.cases.caseView.userActions.mergedCases', {
  defaultMessage: 'merged cases',
});

export const MERGE_DETAILS = i18n.translate('xpack.cases.caseView.userActions.mergeDetails', {
  defaultMessage: 'Details',
});

export const MERGE_COPIED_ALERTS = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.copiedAlerts', {
    values: { count },
    defaultMessage: '{count, plural, one {# alert} other {# alerts}}',
  });

export const MERGE_COPIED_EVENTS = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.copiedEvents', {
    values: { count },
    defaultMessage: '{count, plural, one {# event} other {# events}}',
  });

export const MERGE_COPIED_OBSERVABLES = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.copiedObservables', {
    values: { count },
    defaultMessage: '{count, plural, one {# observable} other {# observables}}',
  });

export const MERGE_COPIED_ATTACKS = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.copiedAttacks', {
    values: { count },
    defaultMessage: '{count, plural, one {# attack} other {# attacks}}',
  });

export const MERGE_COPIED_OTHER = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.copiedOther', {
    values: { count },
    defaultMessage: '{count, plural, one {# other attachment} other {# other attachments}}',
  });

export const MERGE_SOURCE_NEW = (items: string) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.sourceNew', {
    values: { items },
    defaultMessage: 'New: {items}',
  });

export const MERGE_SOURCE_NOTHING_NEW = i18n.translate(
  'xpack.cases.caseView.userActions.merge.sourceNothingNew',
  {
    defaultMessage: 'New: none',
  }
);

export const MERGE_SOURCE_ALREADY_IN_CASE = (items: string) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.sourceAlreadyInCase', {
    values: { items },
    defaultMessage: 'Already in this case: {items}',
  });

export const MERGE_SOURCE_LEFT_OUT = (items: string) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.sourceLeftOut', {
    values: { items },
    defaultMessage: 'Left out, still on the source case: {items}',
  });

export const MERGE_SOURCE_NOT_MERGED = i18n.translate(
  'xpack.cases.caseView.userActions.merge.sourceNotMerged',
  {
    defaultMessage: 'Not merged: some items were not copied, so the case was not linked.',
  }
);

export const MERGE_SOURCE_CLOSED = i18n.translate(
  'xpack.cases.caseView.userActions.merge.sourceClosed',
  {
    defaultMessage: 'Closed by the merge',
  }
);

export const MERGE_NOT_COPIED_FIELDS = (fields: string) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.notCopiedFields', {
    values: { fields },
    defaultMessage: 'Template fields not copied: {fields}',
  });

export const MERGE_UPDATED_FIELD_CONNECTOR = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.connector',
  { defaultMessage: 'connector' }
);

export const MERGE_UPDATED_FIELD_TEMPLATE = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.template',
  { defaultMessage: 'template' }
);

export const MERGE_UPDATED_FIELDS = (fields: string) =>
  i18n.translate('xpack.cases.caseView.userActions.merge.updatedFields', {
    values: { fields },
    defaultMessage: 'Changed on this case: {fields}',
  });

export const MERGE_UPDATED_FIELD_TITLE = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.title',
  { defaultMessage: 'title' }
);

export const MERGE_UPDATED_FIELD_DESCRIPTION = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.description',
  { defaultMessage: 'description' }
);

export const MERGE_UPDATED_FIELD_SEVERITY = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.severity',
  { defaultMessage: 'severity' }
);

export const MERGE_UPDATED_FIELD_CATEGORY = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.category',
  { defaultMessage: 'category' }
);

export const MERGE_UPDATED_FIELD_TAGS = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.tags',
  { defaultMessage: 'tags' }
);

export const MERGE_UPDATED_FIELD_ASSIGNEES = i18n.translate(
  'xpack.cases.caseView.userActions.merge.updatedField.assignees',
  { defaultMessage: 'assignees' }
);

export const ATTACHMENTS_REMOVED = i18n.translate(
  'xpack.cases.caseView.userActions.attachmentsRemoved',
  {
    defaultMessage: 'removed attachments',
  }
);

const ACTION_SOURCE_KIND_LABELS: Record<ActionSourceType, string> = {
  [ActionSourceTypes.agent]: i18n.translate(
    'xpack.cases.caseView.userActions.actionSource.agentLabel',
    {
      defaultMessage: 'Agent',
    }
  ),
  [ActionSourceTypes.workflow]: i18n.translate(
    'xpack.cases.caseView.userActions.actionSource.workflowLabel',
    {
      defaultMessage: 'Workflow',
    }
  ),
  [ActionSourceTypes.rule]: i18n.translate(
    'xpack.cases.caseView.userActions.actionSource.ruleLabel',
    {
      defaultMessage: 'Rule',
    }
  ),
  [ActionSourceTypes.attack]: i18n.translate(
    'xpack.cases.caseView.userActions.actionSource.attackDiscoveryLabel',
    {
      defaultMessage: 'Attack Discovery',
    }
  ),
  [ActionSourceTypes.api]: i18n.translate(
    'xpack.cases.caseView.userActions.actionSource.apiLabel',
    {
      defaultMessage: 'API',
    }
  ),
  [ActionSourceTypes.user]: i18n.translate(
    'xpack.cases.caseView.userActions.actionSource.userLabel',
    {
      defaultMessage: 'User',
    }
  ),
};

export const getActionSourceKindLabel = (type: ActionSourceType): string =>
  ACTION_SOURCE_KIND_LABELS[type];

export const MORE_ACTIVITIES = (count: number) =>
  i18n.translate('xpack.cases.caseView.userActions.moreActivities', {
    values: { count },
    defaultMessage: '{count} more {count, plural, =1 {activity} other {activities}}',
  });

export const SHOW_MORE_ACTIVITIES_ARIA = i18n.translate(
  'xpack.cases.caseView.userActions.showMoreActivitiesAria',
  { defaultMessage: 'Show more activities' }
);

export const NO_SEARCH_RESULTS_TITLE = i18n.translate(
  'xpack.cases.caseView.userActions.noSearchResults.title',
  {
    defaultMessage: 'No results match your search criteria',
  }
);

export const NO_SEARCH_RESULTS_BODY = i18n.translate(
  'xpack.cases.caseView.userActions.noSearchResults.body',
  {
    defaultMessage: 'Try modifying your search or filters.',
  }
);

export const COLLAPSE_ACTIVITY = i18n.translate(
  'xpack.cases.caseView.userActions.collapseActivity',
  { defaultMessage: 'Collapse activity' }
);

export const EXPAND_ACTIVITY = i18n.translate('xpack.cases.caseView.userActions.expandActivity', {
  defaultMessage: 'Expand activity',
});

export const COLLAPSE_ALL_ACTIVITIES = i18n.translate(
  'xpack.cases.caseView.userActions.collapseAllActivities',
  { defaultMessage: 'Collapse all' }
);

export const EXPAND_ALL_ACTIVITIES = i18n.translate(
  'xpack.cases.caseView.userActions.expandAllActivities',
  { defaultMessage: 'Expand all' }
);

export const SHOW_MORE_ACTIVITY = i18n.translate('xpack.cases.userActions.showMoreActivity', {
  defaultMessage: 'Show more',
});

export const NOTHING_TO_COLLAPSE = i18n.translate(
  'xpack.cases.caseView.userActions.nothingToCollapse',
  {
    defaultMessage: 'No comments or attachments to collapse',
  }
);
