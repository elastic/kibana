/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import { Streams, isRoot } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import type { LifecycleEditAction } from '../general_data/modal';

export const useLifecycleState = ({
  definition,
  isServerless,
}: {
  definition: Streams.ingest.all.GetResponse;
  isServerless: boolean;
}) => {
  const [updateInProgress, setUpdateInProgress] = useState(false);
  const [openEditModal, setOpenEditModal] = useState<LifecycleEditAction>('none');

  const lifecycleActions = useMemo(() => {
    const actions: Array<{ name: string; action: LifecycleEditAction }> = [];
    const isClassic = Streams.ClassicStream.GetResponse.is(definition);

    actions.push({
      name: i18n.translate('xpack.streams.streamDetailLifecycle.setRetentionDays', {
        defaultMessage: 'Set specific retention days',
      }),
      action: 'dsl',
    });

    if (!isServerless) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.setLifecyclePolicy', {
          defaultMessage: 'Use a lifecycle policy',
        }),
        action: 'ilm',
      });
    }

    if (isClassic || !isRoot(definition.stream.name)) {
      actions.push({
        name: i18n.translate('xpack.streams.streamDetailLifecycle.resetToDefault', {
          defaultMessage: 'Reset to default',
        }),
        action: 'inherit',
      });
    }

    return actions;
  }, [definition, isServerless]);

  return {
    lifecycleActions,
    openEditModal,
    setOpenEditModal,
    updateInProgress,
    setUpdateInProgress,
  };
};
