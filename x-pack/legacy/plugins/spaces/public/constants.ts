/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { npSetup } from 'ui/new_platform';

let spacesFeatureDescription: string;

export const getSpacesFeatureDescription = () => {
  if (!spacesFeatureDescription) {
    spacesFeatureDescription = i18n.translate('xpack.spaces.featureDescription', {
      defaultMessage:
        'Organize your dashboards and other saved objects into meaningful categories.',
    });
  }

  return spacesFeatureDescription;
};

export const getManageSpacesUrl = () =>
  npSetup.core.http.basePath.prepend(`/app/kibana#/management/spaces/list`);
