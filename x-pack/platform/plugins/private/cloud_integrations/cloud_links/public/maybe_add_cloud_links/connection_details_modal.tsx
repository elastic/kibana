/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  DeploymentDetailsKibanaProvider,
  DeploymentDetailsModal,
} from '@kbn/cloud/deployment_details';

interface Props {
  closeModal: () => void;
  core: CoreStart;
  docLinks: DocLinksStart;
  cloud: CloudStart;
  share: SharePluginStart;
}

export const ConnectionDetailsModal = ({ core, share, cloud, docLinks, closeModal }: Props) => {
  return (
    <DeploymentDetailsKibanaProvider core={core} share={share} cloud={cloud} docLinks={docLinks}>
      <DeploymentDetailsModal closeModal={closeModal} />
    </DeploymentDetailsKibanaProvider>
  );
};
