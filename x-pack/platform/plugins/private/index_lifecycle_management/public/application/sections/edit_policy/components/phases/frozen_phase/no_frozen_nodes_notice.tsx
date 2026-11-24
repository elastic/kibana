/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FunctionComponent } from 'react';
import React from 'react';
import { KbnWarningCallout } from '@kbn/ui-callout';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.frozenPhase.noFrozenNodesTitle', {
    defaultMessage: 'No nodes assigned to the frozen tier',
  }),
  body: i18n.translate('xpack.indexLifecycleMgmt.frozenPhase.noFrozenNodesBody', {
    defaultMessage:
      'The frozen phase mounts indices as partially mounted searchable snapshots on nodes of the frozen tier. Assign the data_frozen role to one or more nodes. Allocation will fail if there are no available nodes.',
  }),
};

export const NoFrozenNodesNotice: FunctionComponent = () => {
  return (
    <KbnWarningCallout
      data-test-subj="noFrozenNodesNotice"
      title={i18nTexts.title}
      text={i18nTexts.body}
    />
  );
};
