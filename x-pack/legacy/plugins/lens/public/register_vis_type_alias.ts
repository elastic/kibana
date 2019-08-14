/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { capabilities } from 'ui/capabilities';
import { visualizations } from '../../../../../src/legacy/core_plugins/visualizations/public';

const NOT_INTERNATIONALIZED_PRODUCT_NAME = 'Lens Visualizations';

visualizations.types.visTypeAliasRegistry.add({
  aliasUrl: '/app/lens',
  name: NOT_INTERNATIONALIZED_PRODUCT_NAME,
  title: i18n.translate('xpack.lens.visTypeAlias.title', {
    defaultMessage: 'Lens Visualizations',
  }),
  description: i18n.translate('xpack.lens.visTypeAlias.description', {
    defaultMessage: `Lens is a simpler way to create basic visualizations`,
  }),
  icon: 'faceHappy',
  appExtensions: {
    visualizations: {
      docTypes: ['lens'],
      searchFields: ['title^3'],
      toListItem(savedObject) {
        const { id, type, attributes } = savedObject;
        const { title } = attributes as { title: string };
        return {
          id,
          title,
          canDelete: !!capabilities.get().visualize.delete,
          canEdit: !!capabilities.get().visualize.save,
          editURL: `/app/lens#/edit/${id}`,
          icon: 'faceHappy',
          isExperimental: true,
          savedObjectType: type,
          typeTitle: i18n.translate('xpack.lens.visTypeAlias.type', { defaultMessage: 'Lens' }),
        };
      },
    },
  },
});
