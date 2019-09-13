/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import { HeaderPanel } from '../header_panel';
import { InspectButton } from '../inspect';

import * as i18n from './translations';

interface Props {
  id: string;
  showInspect: boolean;
  totalCount: number;
}

export const EventsViewerHeader = React.memo<Props>(({ id, showInspect, totalCount }) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="events-viewer-header"
      gutterSize="none"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <HeaderPanel
          subtitle={`${i18n.SHOWING}: ${totalCount.toLocaleString()} ${i18n.UNIT(totalCount)}`}
          title={i18n.EVENTS}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <InspectButton
          compact={true}
          isDisabled={false}
          inputId="global"
          inspectIndex={0}
          queryId={id}
          show={showInspect}
          title={i18n.EVENTS}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

EventsViewerHeader.displayName = 'EventsViewerHeader';
