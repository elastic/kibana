/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { setup as visualizations } from '../../../../../src/legacy/core_plugins/visualizations/public/np_ready/public/legacy';
import { getBasePath, getEditPath } from '../common';

visualizations.types.registerAlias({
  aliasUrl: getBasePath(),
  name: 'lens',
  promotion: {
    description: i18n.translate('xpack.lens.visTypeAlias.promotion.description', {
      defaultMessage: 'Try Lens, our new, intuitive way to create visualizations.',
    }),
    buttonText: i18n.translate('xpack.lens.visTypeAlias.promotion.buttonText', {
      defaultMessage: 'Go to Lens',
    }),
  },
  title: i18n.translate('xpack.lens.visTypeAlias.title', {
    defaultMessage: 'Lens',
  }),
  description: i18n.translate('xpack.lens.visTypeAlias.description', {
    defaultMessage: `Lens is a simpler way to create basic visualizations`,
  }),
  icon: 'lensApp',
  stage: 'beta',
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
          icon: 'lensApp',
          stage: 'beta',
          savedObjectType: type,
          typeTitle: i18n.translate('xpack.lens.visTypeAlias.type', { defaultMessage: 'Lens' }),
        };
      },
    },
  },
});
