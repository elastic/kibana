/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SCOPE_TITLE = i18n.translate('xpack.cases.investigations.scope.title', {
  defaultMessage: 'Scope in context',
});
export const SCOPE_SUBTITLE = i18n.translate('xpack.cases.investigations.scope.subtitle', {
  defaultMessage: 'Hosts, users and non-human identities. Drag nodes to rearrange.',
});
export const LOADING = i18n.translate('xpack.cases.investigations.scope.loading', {
  defaultMessage: 'Loading the scope',
});
export const LOAD_ERROR = i18n.translate('xpack.cases.investigations.scope.loadError', {
  defaultMessage: 'The scope could not be loaded',
});
export const TRUNCATED = (shown: number, total: number) =>
  i18n.translate('xpack.cases.investigations.scope.truncated', {
    defaultMessage: 'Showing {shown} of {total} entities. Use the list view to search the rest.',
    values: {
      shown,
      total,
    },
  });

export const VIEW_LABEL = i18n.translate('xpack.cases.investigations.scope.viewLabel', {
  defaultMessage: 'Scope view',
});
export const VIEW_GRAPH = i18n.translate('xpack.cases.investigations.scope.viewGraph', {
  defaultMessage: 'Graph',
});
export const VIEW_LIST = i18n.translate('xpack.cases.investigations.scope.viewList', {
  defaultMessage: 'List',
});

export const EMPTY_TITLE = i18n.translate('xpack.cases.investigations.scope.emptyTitle', {
  defaultMessage: 'Nothing in scope yet',
});
export const EMPTY_BODY = i18n.translate('xpack.cases.investigations.scope.emptyBody', {
  defaultMessage:
    'Add the hosts, users and identities this investigation covers, then link them to show how they relate.',
});
export const NO_MATCH = i18n.translate('xpack.cases.investigations.scope.noMatch', {
  defaultMessage: 'No entities match the current filters.',
});

export const COUNTS = (inScope: number, suspected: number) =>
  i18n.translate('xpack.cases.investigations.scope.counts', {
    defaultMessage: '{inScope} in scope, {suspected} suspected',
    values: { inScope, suspected },
  });

export const SHOW_EXTERNAL = i18n.translate('xpack.cases.investigations.scope.showExternal', {
  defaultMessage: 'External destinations',
});
export const SHOW_SUSPECTED = i18n.translate('xpack.cases.investigations.scope.showSuspected', {
  defaultMessage: 'Suspected',
});
export const SHOW_DISMISSED = i18n.translate('xpack.cases.investigations.scope.showDismissed', {
  defaultMessage: 'Dismissed',
});
export const FILTERS_LABEL = i18n.translate('xpack.cases.investigations.scope.filtersLabel', {
  defaultMessage: 'Scope filters',
});
export const LAYOUT_LABEL = i18n.translate('xpack.cases.investigations.scope.layoutLabel', {
  defaultMessage: 'Graph layout',
});
export const LAYOUT_SAVED = i18n.translate('xpack.cases.investigations.scope.layoutSaved', {
  defaultMessage: 'Saved layout',
});
export const LAYOUT_BY_TYPE = i18n.translate('xpack.cases.investigations.scope.layoutByType', {
  defaultMessage: 'Group by type',
});
export const LAYOUT_BY_TYPE_HINT = i18n.translate(
  'xpack.cases.investigations.scope.layoutByTypeHint',
  { defaultMessage: 'Grouped by type. Switch to the saved layout to drag nodes.' }
);
export const FIT_VIEW = i18n.translate('xpack.cases.investigations.scope.fitView', {
  defaultMessage: 'Fit view',
});
export const RESET_LAYOUT = i18n.translate('xpack.cases.investigations.scope.resetLayout', {
  defaultMessage: 'Reset layout',
});
export const RESET_LAYOUT_TITLE = i18n.translate(
  'xpack.cases.investigations.scope.resetLayoutTitle',
  { defaultMessage: 'Reset the saved layout?' }
);
export const RESET_LAYOUT_BODY = i18n.translate(
  'xpack.cases.investigations.scope.resetLayoutBody',
  {
    defaultMessage:
      'Saved node positions are cleared for everyone and the graph is laid out again.',
  }
);
export const RESET_LAYOUT_CONFIRM = i18n.translate(
  'xpack.cases.investigations.scope.resetLayoutConfirm',
  { defaultMessage: 'Reset layout' }
);
export const RESET_LAYOUT_SUCCESS = i18n.translate(
  'xpack.cases.investigations.scope.resetLayoutSuccess',
  { defaultMessage: 'The layout was reset.' }
);
export const ADD_ENTITY = i18n.translate('xpack.cases.investigations.scope.addEntity', {
  defaultMessage: 'Add entity',
});
export const ADD_LINK = i18n.translate('xpack.cases.investigations.scope.addLink', {
  defaultMessage: 'Add link',
});

export const LEGEND_LABEL = i18n.translate('xpack.cases.investigations.scope.legendLabel', {
  defaultMessage: 'Graph legend',
});
export const LEGEND_SUSPECTED = i18n.translate('xpack.cases.investigations.scope.legendSuspected', {
  defaultMessage: 'Suspected',
});
export const LEGEND_EXTERNAL = i18n.translate('xpack.cases.investigations.scope.legendExternal', {
  defaultMessage: 'External destination',
});
export const LEGEND_PRIMARY = i18n.translate('xpack.cases.investigations.scope.legendPrimary', {
  defaultMessage: 'Primary scope',
});

export const CRITICALITY_EXTREME = i18n.translate(
  'xpack.cases.investigations.scope.criticalityExtreme',
  { defaultMessage: 'Extreme' }
);
export const CRITICALITY_HIGH = i18n.translate('xpack.cases.investigations.scope.criticalityHigh', {
  defaultMessage: 'High',
});
export const CRITICALITY_MEDIUM = i18n.translate(
  'xpack.cases.investigations.scope.criticalityMedium',
  { defaultMessage: 'Medium' }
);
export const CRITICALITY_LOW = i18n.translate('xpack.cases.investigations.scope.criticalityLow', {
  defaultMessage: 'Low',
});
export const CRITICALITY_NONE = i18n.translate('xpack.cases.investigations.scope.criticalityNone', {
  defaultMessage: 'Not assigned',
});
export const CRITICALITY_OPTIONS = [
  'Extreme impact',
  'High impact',
  'Medium impact',
  'Low impact',
  'Not assigned',
] as const;

export const RISK = (score: number) =>
  i18n.translate('xpack.cases.investigations.scope.risk', {
    defaultMessage: 'Risk {score}',
    values: { score },
  });
export const RISK_LEVEL = (level: string) =>
  i18n.translate('xpack.cases.investigations.scope.riskLevel', {
    defaultMessage: '{level} risk',
    values: { level },
  });

export const STATUS_PRIMARY = i18n.translate('xpack.cases.investigations.scope.statusPrimary', {
  defaultMessage: 'Primary scope',
});
export const STATUS_SCOPED = i18n.translate('xpack.cases.investigations.scope.statusScoped', {
  defaultMessage: 'In scope',
});
export const STATUS_SUSPECTED = i18n.translate('xpack.cases.investigations.scope.statusSuspected', {
  defaultMessage: 'Suspected, not in scope',
});
export const STATUS_SUSPECTED_SHORT = i18n.translate(
  'xpack.cases.investigations.scope.statusSuspectedShort',
  { defaultMessage: 'Suspected' }
);
export const STATUS_DISMISSED = i18n.translate('xpack.cases.investigations.scope.statusDismissed', {
  defaultMessage: 'Dismissed',
});
export const STATUS_EXTERNAL = i18n.translate('xpack.cases.investigations.scope.statusExternal', {
  defaultMessage: 'Context, not an entity',
});
export const STATUS_EXTERNAL_SHORT = i18n.translate(
  'xpack.cases.investigations.scope.statusExternalShort',
  { defaultMessage: 'External' }
);
export const STATUS_PRIMARY_SHORT = i18n.translate(
  'xpack.cases.investigations.scope.statusPrimaryShort',
  { defaultMessage: 'Primary' }
);
export const LINK_CONFIRMED = i18n.translate('xpack.cases.investigations.scope.linkConfirmed', {
  defaultMessage: 'Confirmed',
});
export const LINK_SUSPECTED = i18n.translate('xpack.cases.investigations.scope.linkSuspected', {
  defaultMessage: 'Suspected',
});
export const LINK_DISMISSED = i18n.translate('xpack.cases.investigations.scope.linkDismissed', {
  defaultMessage: 'Dismissed',
});

export const NODE_ARIA = (name: string, criticality: string) =>
  i18n.translate('xpack.cases.investigations.scope.nodeAria', {
    defaultMessage: '{name}, {criticality}',
    values: { name, criticality },
  });
export const EDGE_ARIA = (label: string, from: string, to: string) =>
  i18n.translate('xpack.cases.investigations.scope.edgeAria', {
    defaultMessage: '{label}, from {from} to {to}',
    values: { label, from, to },
  });

/* List view */
export const LIST_SEARCH = i18n.translate('xpack.cases.investigations.scope.listSearch', {
  defaultMessage: 'Search entities',
});
export const LIST_TYPE_FILTER = i18n.translate('xpack.cases.investigations.scope.listTypeFilter', {
  defaultMessage: 'Filter by type',
});
export const LIST_ALL_TYPES = i18n.translate('xpack.cases.investigations.scope.listAllTypes', {
  defaultMessage: 'All types',
});
export const COL_ENTITY = i18n.translate('xpack.cases.investigations.scope.colEntity', {
  defaultMessage: 'Entity',
});
export const COL_TYPE = i18n.translate('xpack.cases.investigations.scope.colType', {
  defaultMessage: 'Type',
});
export const COL_STATUS = i18n.translate('xpack.cases.investigations.scope.colStatus', {
  defaultMessage: 'Status',
});
export const COL_CRITICALITY = i18n.translate('xpack.cases.investigations.scope.colCriticality', {
  defaultMessage: 'Criticality',
});
export const COL_RISK = i18n.translate('xpack.cases.investigations.scope.colRisk', {
  defaultMessage: 'Risk',
});
export const COL_EVIDENCE = i18n.translate('xpack.cases.investigations.scope.colEvidence', {
  defaultMessage: 'Evidence',
});
export const COL_ACTIONS = i18n.translate('xpack.cases.investigations.scope.colActions', {
  defaultMessage: 'Actions',
});
export const ACTION_INSPECT = i18n.translate('xpack.cases.investigations.scope.actionInspect', {
  defaultMessage: 'Inspect',
});
export const ACTION_INSPECT_DESC = (name: string) =>
  i18n.translate('xpack.cases.investigations.scope.actionInspectDesc', {
    defaultMessage: 'Open the inspector for {name}',
    values: { name },
  });
export const ACTION_ADD_TO_SCOPE = i18n.translate(
  'xpack.cases.investigations.scope.actionAddToScope',
  { defaultMessage: 'Add to scope' }
);
export const ACTION_DISMISS = i18n.translate('xpack.cases.investigations.scope.actionDismiss', {
  defaultMessage: 'Dismiss',
});
export const LIST_TABLE_CAPTION = i18n.translate(
  'xpack.cases.investigations.scope.listTableCaption',
  { defaultMessage: 'Entities in this investigation' }
);

/* Inspector */
export const INSPECTOR_EMPTY_TITLE = i18n.translate(
  'xpack.cases.investigations.scope.inspectorEmptyTitle',
  { defaultMessage: 'Select an entity or a connection' }
);
export const INSPECTOR_EMPTY_BODY = i18n.translate(
  'xpack.cases.investigations.scope.inspectorEmptyBody',
  {
    defaultMessage:
      'Choose a node or a line in the graph, or a row in the list, to see its details.',
  }
);
export const INSPECTOR_LABEL = i18n.translate('xpack.cases.investigations.scope.inspectorLabel', {
  defaultMessage: 'Scope inspector',
});
export const INSPECTOR_NOT_FOUND = i18n.translate(
  'xpack.cases.investigations.scope.inspectorNotFound',
  { defaultMessage: 'That item is no longer in the scope.' }
);
export const KIND_HOST = i18n.translate('xpack.cases.investigations.scope.kindHost', {
  defaultMessage: 'Host',
});
export const KIND_USER = i18n.translate('xpack.cases.investigations.scope.kindUser', {
  defaultMessage: 'User',
});
export const KIND_NHI = i18n.translate('xpack.cases.investigations.scope.kindNhi', {
  defaultMessage: 'Non-human identity',
});
export const KIND_EXTERNAL = i18n.translate('xpack.cases.investigations.scope.kindExternal', {
  defaultMessage: 'External destination',
});
export const FIELD_SCOPE_STATUS = i18n.translate(
  'xpack.cases.investigations.scope.fieldScopeStatus',
  { defaultMessage: 'Scope status' }
);
export const FIELD_CRITICALITY = i18n.translate(
  'xpack.cases.investigations.scope.fieldCriticality',
  { defaultMessage: 'Criticality' }
);
export const FIELD_RISK = i18n.translate('xpack.cases.investigations.scope.fieldRisk', {
  defaultMessage: 'Risk',
});
export const FIELD_TYPE = i18n.translate('xpack.cases.investigations.scope.fieldType', {
  defaultMessage: 'Type',
});
export const SECTION_ATTRIBUTES = i18n.translate(
  'xpack.cases.investigations.scope.sectionAttributes',
  { defaultMessage: 'Attributes' }
);
export const SECTION_TAGS = i18n.translate('xpack.cases.investigations.scope.sectionTags', {
  defaultMessage: 'Tags',
});
export const SECTION_EVIDENCE = i18n.translate('xpack.cases.investigations.scope.sectionEvidence', {
  defaultMessage: 'Linked evidence',
});
export const SECTION_CONNECTIONS = i18n.translate(
  'xpack.cases.investigations.scope.sectionConnections',
  { defaultMessage: 'Connections' }
);
export const NO_EVIDENCE = i18n.translate('xpack.cases.investigations.scope.noEvidence', {
  defaultMessage: 'No evidence is linked yet.',
});
export const NO_CONNECTIONS = i18n.translate('xpack.cases.investigations.scope.noConnections', {
  defaultMessage: 'No connections.',
});
export const NO_ATTRIBUTES = i18n.translate('xpack.cases.investigations.scope.noAttributes', {
  defaultMessage: 'No attributes recorded.',
});
export const OPEN_EVIDENCE = (ref: string) =>
  i18n.translate('xpack.cases.investigations.scope.openEvidence', {
    defaultMessage: 'Open evidence {ref}',
    values: { ref },
  });
export const CONNECTION_FROM = i18n.translate('xpack.cases.investigations.scope.connectionFrom', {
  defaultMessage: 'from',
});
export const CONNECTION_TO = i18n.translate('xpack.cases.investigations.scope.connectionTo', {
  defaultMessage: 'to',
});
export const OPEN_CONNECTION = (label: string) =>
  i18n.translate('xpack.cases.investigations.scope.openConnection', {
    defaultMessage: 'Open the connection {label}',
    values: { label },
  });
export const ADD_LINK_FROM_HERE = i18n.translate(
  'xpack.cases.investigations.scope.addLinkFromHere',
  { defaultMessage: 'Add link from here' }
);
export const STATUS_CHANGED_SUCCESS = (name: string) =>
  i18n.translate('xpack.cases.investigations.scope.statusChangedSuccess', {
    defaultMessage: 'Updated the scope status of {name}.',
    values: { name },
  });
export const ADDED_TO_SCOPE_SUCCESS = (name: string) =>
  i18n.translate('xpack.cases.investigations.scope.addedToScopeSuccess', {
    defaultMessage: '{name} is now in scope.',
    values: { name },
  });
export const DISMISSED_SUCCESS = (name: string) =>
  i18n.translate('xpack.cases.investigations.scope.dismissedSuccess', {
    defaultMessage: 'Dismissed {name} as not in scope.',
    values: { name },
  });
export const LINK_STATUS_SUCCESS = i18n.translate(
  'xpack.cases.investigations.scope.linkStatusSuccess',
  { defaultMessage: 'Updated the connection.' }
);
export const LINK_CONFIRMED_SUCCESS = i18n.translate(
  'xpack.cases.investigations.scope.linkConfirmedSuccess',
  { defaultMessage: 'Marked as confirmed.' }
);
export const MARK_CONFIRMED = i18n.translate('xpack.cases.investigations.scope.markConfirmed', {
  defaultMessage: 'Mark as confirmed',
});
export const CONFIRM_HINT = i18n.translate('xpack.cases.investigations.scope.confirmHint', {
  defaultMessage: 'Confirm only with direct evidence.',
});
export const EDGE_FROM = i18n.translate('xpack.cases.investigations.scope.edgeFrom', {
  defaultMessage: 'From',
});
export const EDGE_TO = i18n.translate('xpack.cases.investigations.scope.edgeTo', {
  defaultMessage: 'To',
});
export const EDGE_KIND = i18n.translate('xpack.cases.investigations.scope.edgeKind', {
  defaultMessage: 'Type',
});
export const EDGE_LABEL = i18n.translate('xpack.cases.investigations.scope.edgeLabel', {
  defaultMessage: 'Label',
});
export const EDGE_STATUS = i18n.translate('xpack.cases.investigations.scope.edgeStatus', {
  defaultMessage: 'Status',
});
export const EDGE_DESCRIPTION = i18n.translate('xpack.cases.investigations.scope.edgeDescription', {
  defaultMessage: 'What it shows',
});
export const EDGE_CLAIM = i18n.translate('xpack.cases.investigations.scope.edgeClaim', {
  defaultMessage: 'Settling claim',
});
export const OPEN_CLAIM = (ref: string) =>
  i18n.translate('xpack.cases.investigations.scope.openClaim', {
    defaultMessage: 'Open claim {ref}',
    values: { ref },
  });
export const NO_DESCRIPTION = i18n.translate('xpack.cases.investigations.scope.noDescription', {
  defaultMessage: 'No description.',
});

/* Add entity modal */
export const ADD_ENTITY_TITLE = i18n.translate('xpack.cases.investigations.scope.addEntityTitle', {
  defaultMessage: 'Add an entity',
});
export const ADD_ENTITY_TYPE = i18n.translate('xpack.cases.investigations.scope.addEntityType', {
  defaultMessage: 'Type',
});
export const ADD_ENTITY_NAME = i18n.translate('xpack.cases.investigations.scope.addEntityName', {
  defaultMessage: 'Name',
});
export const ADD_ENTITY_NAME_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.scope.addEntityNamePlaceholder',
  { defaultMessage: 'Host name, user name or address' }
);
export const ADD_ENTITY_STATUS = i18n.translate(
  'xpack.cases.investigations.scope.addEntityStatus',
  { defaultMessage: 'Scope status' }
);
export const ADD_ENTITY_CRITICALITY = i18n.translate(
  'xpack.cases.investigations.scope.addEntityCriticality',
  { defaultMessage: 'Criticality' }
);
export const ADD_ENTITY_SUBMIT = i18n.translate(
  'xpack.cases.investigations.scope.addEntitySubmit',
  { defaultMessage: 'Add entity' }
);
export const ADD_ENTITY_SUCCESS = (name: string) =>
  i18n.translate('xpack.cases.investigations.scope.addEntitySuccess', {
    defaultMessage: 'Added {name} to the scope.',
    values: { name },
  });
export const NAME_REQUIRED = i18n.translate('xpack.cases.investigations.scope.nameRequired', {
  defaultMessage: 'Enter a name.',
});
export const NAME_TOO_LONG = i18n.translate('xpack.cases.investigations.scope.nameTooLong', {
  defaultMessage: 'Use 512 characters or fewer.',
});
export const NAME_EXISTS = i18n.translate('xpack.cases.investigations.scope.nameExists', {
  defaultMessage: 'An entity of this type with that name already exists.',
});
export const EXTERNAL_STATUS_NOTE = i18n.translate(
  'xpack.cases.investigations.scope.externalStatusNote',
  {
    defaultMessage:
      'External destinations are context. They stay external and are not counted as in scope.',
  }
);

/* Add link modal */
export const ADD_LINK_TITLE = i18n.translate('xpack.cases.investigations.scope.addLinkTitle', {
  defaultMessage: 'Add a link',
});
export const ADD_LINK_FROM = i18n.translate('xpack.cases.investigations.scope.addLinkFrom', {
  defaultMessage: 'From',
});
export const ADD_LINK_TO = i18n.translate('xpack.cases.investigations.scope.addLinkTo', {
  defaultMessage: 'To',
});
export const ADD_LINK_KIND = i18n.translate('xpack.cases.investigations.scope.addLinkKind', {
  defaultMessage: 'Type',
});
export const ADD_LINK_LABEL = i18n.translate('xpack.cases.investigations.scope.addLinkLabel', {
  defaultMessage: 'Label',
});
export const ADD_LINK_LABEL_PLACEHOLDER = i18n.translate(
  'xpack.cases.investigations.scope.addLinkLabelPlaceholder',
  { defaultMessage: 'What connects them, for example "Logon to the file server"' }
);
export const ADD_LINK_STATUS = i18n.translate('xpack.cases.investigations.scope.addLinkStatus', {
  defaultMessage: 'Status',
});
export const ADD_LINK_SUBMIT = i18n.translate('xpack.cases.investigations.scope.addLinkSubmit', {
  defaultMessage: 'Add link',
});
export const ADD_LINK_SUCCESS = i18n.translate('xpack.cases.investigations.scope.addLinkSuccess', {
  defaultMessage: 'Added the link.',
});
export const ADD_LINK_NEEDS_TWO = i18n.translate(
  'xpack.cases.investigations.scope.addLinkNeedsTwo',
  { defaultMessage: 'Add at least two entities before you link them.' }
);
export const CHOOSE_ENTITY = i18n.translate('xpack.cases.investigations.scope.chooseEntity', {
  defaultMessage: 'Choose an entity',
});
export const FROM_REQUIRED = i18n.translate('xpack.cases.investigations.scope.fromRequired', {
  defaultMessage: 'Choose where the link starts.',
});
export const TO_REQUIRED = i18n.translate('xpack.cases.investigations.scope.toRequired', {
  defaultMessage: 'Choose where the link ends.',
});
export const SAME_ENTITY = i18n.translate('xpack.cases.investigations.scope.sameEntity', {
  defaultMessage: 'A link needs two different entities.',
});
export const LABEL_REQUIRED = i18n.translate('xpack.cases.investigations.scope.labelRequired', {
  defaultMessage: 'Enter a label.',
});
export const LABEL_TOO_LONG = i18n.translate('xpack.cases.investigations.scope.labelTooLong', {
  defaultMessage: 'Use 512 characters or fewer.',
});
export const CANCEL = i18n.translate('xpack.cases.investigations.scope.cancel', {
  defaultMessage: 'Cancel',
});

export const CLOSE_INSPECTOR = i18n.translate('xpack.cases.investigations.scope.closeInspector', {
  defaultMessage: 'Close the inspector',
});

export const EMPTY_VALUE = i18n.translate('xpack.cases.investigations.scope.emptyValue', {
  defaultMessage: '-',
});
