/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { uniqBy } from 'lodash';

import type { PackageInfo } from '../../common';
import { useStartServices } from '../hooks';

export const getNumTransformAssets = (assets?: PackageInfo['assets']) => {
  if (
    !assets ||
    !(
      Array.isArray(assets.elasticsearch?.transform) &&
      (assets.elasticsearch?.transform?.length ?? 0) > 0
    )
  ) {
    return 0;
  }

  return uniqBy(assets.elasticsearch?.transform, 'file').length;
};
export const TransformInstallWithCurrentUserPermissionCallout: React.FunctionComponent<{
  count: number;
}> = ({ count }) => {
  const { docLinks } = useStartServices();
  return (
    <EuiCallOut color="primary" iconType="info">
      <FormattedMessage
        id="xpack.fleet.createPackagePolicy.transformInstallWithCurrentUserPermissionCallout.text"
        defaultMessage="This package has {count, plural, one {one} other {#}} {docsLink} which will be created and started with the same roles as the user installing the package."
        values={{
          count,
          docsLink: (
            <EuiLink href={docLinks.links.transforms.overview} target="_blank" external>
              <FormattedMessage
                id="xpack.fleet.createPackagePolicy.transformInstallWithCurrentUserPermissionCallout.docsLink"
                defaultMessage="{count, plural, one {transform asset} other {transform assets}}"
                values={{ count }}
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
