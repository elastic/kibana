/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.title', {
    defaultMessage: 'Migrate to data tiers',
  }),
  body: i18n.translate('xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.body', {
    defaultMessage: 'Migrate your Elastic Cloud deployment to use data tiers.',
  }),
  linkText: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.cloudDataTierCallout.linkToCloudDeploymentDescription',
    { defaultMessage: 'View cloud deployment' }
  ),
};

interface Props {
  linkToCloudDeployment?: string;
}

/**
 * A call-to-action for users to migrate to data tiers if their cluster is still running
 * the deprecated node.data:true config.
 */
export const CloudDataTierCallout: FunctionComponent<Props> = ({ linkToCloudDeployment }) => {
  return (
    <KbnInfoCallout
      title={i18nTexts.title}
      data-test-subj="cloudDataTierCallout"
      text={i18nTexts.body}
      actionProps={
        linkToCloudDeployment
          ? {
              primary: {
                href: linkToCloudDeployment,
                target: '_blank',
                children: i18nTexts.linkText,
                iconType: 'external',
                iconSide: 'right',
              },
            }
          : undefined
      }
    />
  );
};
