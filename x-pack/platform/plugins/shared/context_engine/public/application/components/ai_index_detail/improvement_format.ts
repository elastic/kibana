/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ImprovementAction } from '../../../../common/http_api/improvement_actions';
import type { Improvement, ImprovementStatus } from '../../../../common/http_api/improvements';

/** Rationale, KI content and workflow YAML routinely run past a screen; clamp and offer show-more. */
export const MAX_PREVIEW_LENGTH = 1000;

export interface TruncatedText {
  text: string;
  isTruncated: boolean;
}

export const truncate = (value: string, limit = MAX_PREVIEW_LENGTH): TruncatedText =>
  value.length <= limit
    ? { text: value, isTruncated: false }
    : { text: `${value.slice(0, limit)}…`, isTruncated: true };

/**
 * What the action does, in words.
 *
 * The removals are deliberately not phrased as deletions: approving `remove_ki` flags the indicator
 * excluded and `remove_workflow` disables the automation, both recoverable. A label that implied
 * destruction would misrepresent the decision the reviewer is being asked to make.
 */
export const getActionLabel = (action: ImprovementAction): string => {
  switch (action) {
    case 'add_ki':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.addKi', {
        defaultMessage: 'Add knowledge indicator',
      });
    case 'edit_ki':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.editKi', {
        defaultMessage: 'Edit knowledge indicator',
      });
    case 'remove_ki':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.removeKi', {
        defaultMessage: 'Exclude knowledge indicator',
      });
    case 'add_workflow':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.addWorkflow', {
        defaultMessage: 'Add automation',
      });
    case 'edit_workflow':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.editWorkflow', {
        defaultMessage: 'Edit automation',
      });
    case 'remove_workflow':
      return i18n.translate(
        'xpack.contextEngine.aiIndexDetail.improvements.action.removeWorkflow',
        { defaultMessage: 'Disable automation' }
      );
    case 'add_source':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.addSource', {
        defaultMessage: 'Add source',
      });
    case 'edit_source':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.editSource', {
        defaultMessage: 'Edit source',
      });
    case 'remove_source':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.action.removeSource', {
        defaultMessage: 'Remove source',
      });
  }
};

/** Spells out that a removal can be undone, so the row does not read as destruction. */
export const getReversibilityNote = (action: ImprovementAction): string | undefined => {
  switch (action) {
    case 'remove_ki':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.reversible.removeKi', {
        defaultMessage:
          'The indicator is flagged excluded rather than deleted, so this can be undone.',
      });
    case 'remove_workflow':
      return i18n.translate(
        'xpack.contextEngine.aiIndexDetail.improvements.reversible.removeWorkflow',
        {
          defaultMessage:
            'The automation is disabled and unlinked rather than deleted, so this can be undone.',
        }
      );
    case 'remove_source':
      return i18n.translate(
        'xpack.contextEngine.aiIndexDetail.improvements.reversible.removeSource',
        {
          defaultMessage:
            'The source is unlinked. Indicators it already produced are left in the index.',
        }
      );
    default:
      return undefined;
  }
};

export const getStatusLabel = (status: ImprovementStatus): string => {
  switch (status) {
    case 'suggested':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.suggested', {
        defaultMessage: 'Suggested',
      });
    case 'applied':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.applied', {
        defaultMessage: 'Applied',
      });
    case 'rejected':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.rejected', {
        defaultMessage: 'Rejected',
      });
    case 'failed':
      return i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.status.failed', {
        defaultMessage: 'Failed',
      });
  }
};

export const getStatusColor = (status: ImprovementStatus): string => {
  switch (status) {
    case 'suggested':
      return 'hollow';
    case 'applied':
      return 'success';
    case 'rejected':
      return 'default';
    case 'failed':
      return 'danger';
  }
};

/** A field of the proposed change, rendered as a labelled row. */
export interface ProposedChangeField {
  label: string;
  value: string;
  /** Rendered in a code block rather than as prose. */
  isCode?: boolean;
}

const kiFields = (
  ki: Record<string, unknown> | undefined,
  fields: ProposedChangeField[]
): ProposedChangeField[] => {
  if (!ki) {
    return fields;
  }

  const push = (label: string, value: unknown, isCode = false) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    fields.push({
      label,
      value: Array.isArray(value) ? value.join(', ') : String(value),
      ...(isCode ? { isCode: true } : {}),
    });
  };

  push(
    i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.kiType', {
      defaultMessage: 'Type',
    }),
    ki.type
  );
  push(
    i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.kiTitle', {
      defaultMessage: 'Title',
    }),
    ki.title
  );
  push(
    i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.kiDescription', {
      defaultMessage: 'Description',
    }),
    ki.description
  );
  push(
    i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.kiContent', {
      defaultMessage: 'Content',
    }),
    ki.content
  );
  push(
    i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.kiTags', {
      defaultMessage: 'Tags',
    }),
    ki.tags
  );

  return fields;
};

/**
 * The proposed change as a human-readable set of fields: the KI fields for a `*_ki` action, the
 * YAML for a `*_workflow` one, the query or connector for a `*_source` one.
 */
export const getProposedChangeFields = (improvement: Improvement): ProposedChangeField[] => {
  const { action, payload, target } = improvement;
  const fields: ProposedChangeField[] = [];

  if (target?.ki_id) {
    fields.push({
      label: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.targetKi', {
        defaultMessage: 'Knowledge indicator',
      }),
      value: target.ki_id,
    });
  }
  if (target?.workflow_id) {
    fields.push({
      label: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.targetWorkflow', {
        defaultMessage: 'Automation',
      }),
      value: target.workflow_id,
    });
  }
  if (target?.source_value) {
    fields.push({
      label: i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.targetSource', {
        defaultMessage: 'Current source',
      }),
      value: target.source_value,
      isCode: true,
    });
  }

  kiFields(payload.ki as Record<string, unknown> | undefined, fields);
  kiFields(payload.ki_patch as Record<string, unknown> | undefined, fields);

  if (payload.workflow_yaml) {
    fields.push({
      label:
        action === 'edit_workflow'
          ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.workflowNewYaml', {
              defaultMessage: 'Replacement definition',
            })
          : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.workflowYaml', {
              defaultMessage: 'Definition',
            }),
      value: payload.workflow_yaml,
      isCode: true,
    });
  }

  if (payload.source) {
    fields.push({
      label:
        payload.source.type === 'connector'
          ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.sourceConnector', {
              defaultMessage: 'Connector',
            })
          : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.field.sourceQuery', {
              defaultMessage: 'Query',
            }),
      value: payload.source.value,
      isCode: true,
    });
  }

  return fields;
};

/** Where the improvement came from, as one sentence a reviewer can weigh. */
export const getProvenanceSummary = ({ provenance }: Improvement): string => {
  const { signal_count: signalCount, tags, signal_window: window } = provenance;

  return tags && tags.length > 0
    ? i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.provenanceWithTags', {
        defaultMessage:
          'From {signalCount, plural, one {# signal} other {# signals}} ({tags}) between {from} and {to}',
        values: { signalCount, tags: tags.join(', '), from: window.from, to: window.to },
      })
    : i18n.translate('xpack.contextEngine.aiIndexDetail.improvements.provenance', {
        defaultMessage:
          'From {signalCount, plural, one {# signal} other {# signals}} between {from} and {to}',
        values: { signalCount, from: window.from, to: window.to },
      });
};
