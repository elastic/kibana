/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayStart, NotificationsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ITagInternalClient } from '../../services';
import { TagBulkAction } from '../types';

interface GetBulkDeleteActionOptions {
  overlays: OverlayStart;
  notifications: NotificationsStart;
  tagClient: ITagInternalClient;
  setLoading: (loading: boolean) => void;
}

export const getBulkDeleteAction = ({
  overlays,
  notifications,
  tagClient,
  setLoading,
}: GetBulkDeleteActionOptions): TagBulkAction => {
  return {
    id: 'delete',
    label: i18n.translate('xpack.savedObjectsTagging.management.actions.bulkDelete.label', {
      defaultMessage: 'Delete',
    }),
    'aria-label': i18n.translate(
      'xpack.savedObjectsTagging.management.actions.bulkDelete.ariaLabel',
      {
        defaultMessage: 'Delete selected tags',
      }
    ),
    icon: 'trash',
    refreshAfterExecute: true,
    execute: async (tagIds) => {
      const confirmed = await overlays.openConfirm(
        i18n.translate('xpack.savedObjectsTagging.management.actions.bulkDelete.confirm.text', {
          defaultMessage:
            'By deleting {count, plural, one {this tag} other {these tags}}, you will no longer be able to assign {count, plural, one {it} other {them}} to saved objects. ' +
            '{count, plural, one {This tag} other {These tags}} will be removed from any saved objects that currently use {count, plural, one {it} other {them}}.',
          values: {
            count: tagIds.length,
          },
        }),
        {
          title: i18n.translate(
            'xpack.savedObjectsTagging.management.actions.bulkDelete.confirm.title',
            {
              defaultMessage: 'Delete {count, plural, one {1 tag} other {# tags}}',
              values: {
                count: tagIds.length,
              },
            }
          ),
          confirmButtonText: i18n.translate(
            'xpack.savedObjectsTagging.management.actions.bulkDelete.confirm.confirmButtonText',
            {
              defaultMessage: 'Delete {count, plural, one {tag} other {tags}}',
              values: {
                count: tagIds.length,
              },
            }
          ),
          buttonColor: 'danger',
          maxWidth: 560,
        }
      );

      if (confirmed) {
        setLoading(true);
        await tagClient.bulkDelete(tagIds);
        setLoading(false);

        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.savedObjectsTagging.management.actions.bulkDelete.notification.successTitle',
            {
              defaultMessage: 'Deleted {count, plural, one {1 tag} other {# tags}}',
              values: {
                count: tagIds.length,
              },
            }
          ),
        });
      }
    },
  };
};
