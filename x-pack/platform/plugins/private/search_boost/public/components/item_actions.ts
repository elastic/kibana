/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useLatest from 'react-use/lib/useLatest';
import type { ContentListItem, ContentListItemConfig } from '@kbn/content-list-provider';
import type { ActionProps } from '@kbn/content-list';
import { DELETE_LABEL, DUPLICATE_LABEL } from '../translations';

export const DUPLICATE_ACTION = 'duplicate';
// Not `delete`, which would bring Content List's own confirmation modal.
export const DELETE_ACTION = 'remove';

type SharedActionProps = Pick<ActionProps, 'id' | 'name' | 'description' | 'icon' | 'color'>;

export const DUPLICATE_ACTION_PROPS: SharedActionProps = {
  id: DUPLICATE_ACTION,
  name: DUPLICATE_LABEL,
  description: DUPLICATE_LABEL,
  icon: 'copy',
};

export const DELETE_ACTION_PROPS: SharedActionProps = {
  id: DELETE_ACTION,
  name: DELETE_LABEL,
  description: DELETE_LABEL,
  icon: 'trash',
  color: 'danger',
};

type Restriction = (item: ContentListItem) => string | undefined;

interface ItemActionsConfig<T> {
  canEdit: boolean;
  getSource: (item: ContentListItem) => T | undefined;
  onEdit?: (source: T) => void;
  onDuplicate?: (source: T) => void;
  onDelete?: (source: T) => void;
  editRestriction?: Restriction;
  deleteRestriction?: Restriction;
}

/** Row actions for the callbacks passed in; they're read on each click, so they can change freely. */
export const useItemActions = <T>(config: ItemActionsConfig<T>) => {
  const latest = useLatest(config);
  const { canEdit, onEdit, onDuplicate, onDelete } = config;
  const hasEdit = Boolean(onEdit);
  const hasDuplicate = Boolean(onDuplicate);
  const hasDelete = Boolean(onDelete);

  return useMemo<ContentListItemConfig | undefined>(() => {
    if (!canEdit) {
      return undefined;
    }
    const callWithSource =
      (getCallback: () => ((source: T) => void) | undefined) => (item: ContentListItem) => {
        const source = latest.current.getSource(item);
        if (source) {
          getCallback()?.(source);
        }
      };
    return {
      actions: {
        ...(hasEdit && {
          edit: {
            onItemAction: callWithSource(() => latest.current.onEdit),
            restriction: (item: ContentListItem) => latest.current.editRestriction?.(item),
          },
        }),
        ...(hasDuplicate && {
          [DUPLICATE_ACTION]: { onItemAction: callWithSource(() => latest.current.onDuplicate) },
        }),
        ...(hasDelete && {
          [DELETE_ACTION]: {
            onItemAction: callWithSource(() => latest.current.onDelete),
            restriction: (item: ContentListItem) => latest.current.deleteRestriction?.(item),
          },
        }),
      },
    };
  }, [latest, canEdit, hasEdit, hasDuplicate, hasDelete]);
};
