/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { visualizations } from '../../../../../src/legacy/core_plugins/visualizations/public';
import { BASE_APP_URL, getEditPath } from '../common';

visualizations.types.visTypeAliasRegistry.add({
  aliasUrl: BASE_APP_URL,
  name: 'lens',
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
          editUrl: getEditPath(id),
          icon: 'faceHappy',
          isExperimental: true,
          savedObjectType: type,
          typeTitle: i18n.translate('xpack.lens.visTypeAlias.type', { defaultMessage: 'Lens' }),
        };
      },
    },
  },
});
