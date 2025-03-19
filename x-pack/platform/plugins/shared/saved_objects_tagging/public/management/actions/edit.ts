/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { TagWithRelations } from '../../../common/types';
import { getEditModalOpener } from '../../components/edition_modal';
import { ITagInternalClient } from '../../services/tags';
import { StartServices } from '../../types';
import { TagAction } from './types';

interface GetEditActionOptions extends StartServices {
  tagClient: ITagInternalClient;
  fetchTags: () => Promise<void>;
}

export const getEditAction = ({
  tagClient,
  fetchTags,
  ...startServices
}: GetEditActionOptions): TagAction => {
  const editModalOpener = getEditModalOpener({
    ...startServices,
    tagClient,
  });
  return {
    id: 'edit',
    name: ({ name }) =>
      i18n.translate('xpack.savedObjectsTagging.management.table.actions.edit.title', {
        defaultMessage: 'Edit {name} tag',
        values: { name },
      }),
    isPrimary: true,
    description: i18n.translate(
      'xpack.savedObjectsTagging.management.table.actions.edit.description',
      {
        defaultMessage: 'Edit this tag',
      }
    ),
    type: 'icon',
    icon: 'pencil',
    available: (tag) => !tag.managed,
    onClick: (tag: TagWithRelations) => {
      const { notifications } = startServices;
      editModalOpener({
        tagId: tag.id,
        onUpdate: (updatedTag) => {
          fetchTags();
          notifications.toasts.addSuccess({
            title: i18n.translate('xpack.savedObjectsTagging.notifications.editTagSuccessTitle', {
              defaultMessage: 'Saved changes to "{name}" tag',
              values: {
                name: updatedTag.name,
              },
            }),
          });
        },
      });
    },
    'data-test-subj': 'tagsTableAction-edit',
  };
};
