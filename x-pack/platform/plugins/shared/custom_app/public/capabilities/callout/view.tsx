/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import type { CapabilityViewProps } from '../capability_views';

const CALLOUTS = {
  primary: KbnInfoCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
  danger: KbnDangerCallout,
} as const;

export const CalloutView = ({ node, text }: CapabilityViewProps<AppNodeOfType<'callout'>>) => {
  const Callout = CALLOUTS[node.color];
  return (
    <Callout announceOnMount={false} title={text(node.title)} size="s" data-node-id={node.id}>
      {node.text ? <p>{text(node.text)}</p> : null}
    </Callout>
  );
};
