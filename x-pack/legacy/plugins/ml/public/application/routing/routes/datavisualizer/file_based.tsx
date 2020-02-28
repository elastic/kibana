/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { FileDataVisualizerPage } from '../../../datavisualizer/file_based';

import { checkBasicLicense } from '../../../license/check_license';
import { checkFindFileStructurePrivilege } from '../../../privilege/check_privilege';
import { loadIndexPatterns } from '../../../util/index_utils';

import { getMlNodeCount } from '../../../ml_nodes_check';
import { DATA_VISUALIZER_BREADCRUMB, ML_BREADCRUMB } from '../../breadcrumbs';

const breadcrumbs = [
  ML_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  {
    text: i18n.translate('xpack.ml.dataVisualizer.fileBasedLabel', {
      defaultMessage: 'File',
    }),
    href: '',
  },
];

export const fileBasedRoute: MlRoute = {
  path: '/filedatavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs,
};

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver('', undefined, deps.config, {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkFindFileStructurePrivilege,
    getMlNodeCount,
  });
  return (
    <PageLoader context={context}>
      <FileDataVisualizerPage kibanaConfig={deps.config} />
    </PageLoader>
  );
};
