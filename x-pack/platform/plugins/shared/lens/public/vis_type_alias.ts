/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { VisTypeAlias } from '@kbn/visualizations-plugin/public';
import {
  APP_ID,
  getBasePath,
  getEditPath,
  LENS_EMBEDDABLE_TYPE,
  LENS_ICON,
  STAGE_ID,
} from '../common/constants';
import { getLensClient } from './persistence/lens_client';

export const lensVisTypeAlias: VisTypeAlias = {
  alias: {
    path: getBasePath(),
    app: APP_ID,
  },
  name: APP_ID,
  promotion: true,
  title: i18n.translate('xpack.lens.visTypeAlias.title', {
    defaultMessage: 'Lens',
  }),
  description: i18n.translate('xpack.lens.visTypeAlias.description', {
    defaultMessage:
      'Create visualizations using an intuitive drag-and-drop interface. Smart suggestions help you follow best practices and find the chart types that best match your data.',
  }),
  order: 60,
  icon: LENS_ICON,
  stage: STAGE_ID,
  appExtensions: {
    visualizations: {
      docTypes: [LENS_EMBEDDABLE_TYPE],
      searchFields: ['title^3'],
      clientOptions: { update: { overwrite: true } },
      client: getLensClient,
      toListItem(savedObject) {
        const { id, type, updatedAt, attributes, managed } = savedObject;
        const { title, description } = attributes as { title: string; description?: string };
        return {
          id,
          title,
          description,
          updatedAt,
          managed,
          editor: { editUrl: getEditPath(id), editApp: 'lens' },
          icon: LENS_ICON,
          stage: STAGE_ID,
          savedObjectType: type,
          type: LENS_EMBEDDABLE_TYPE,
          typeTitle: i18n.translate('xpack.lens.visTypeAlias.type', { defaultMessage: 'Lens' }),
        };
      },
    },
  },
};
