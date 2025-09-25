/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  Streams,
  isDslLifecycle,
  isIlmLifecycle,
  isInheritLifecycle,
  isRoot,
} from '@kbn/streams-schema';
import React from 'react';
import { BaseMetricCard } from '../../common/base_metric_card';
import { getTimeSizeAndUnitLabel } from '../../helpers/format_size_units';
import { IlmLink } from '../ilm_link';

export const RetentionCard = ({
  definition,
  openEditModal,
}: {
  definition: Streams.ingest.all.GetResponse;
  openEditModal: () => void;
}) => {
  const lifecycle = definition.effective_lifecycle;

  const isRootStream = isRoot(definition.stream.name);
  const isWiredStream = Streams.WiredStream.GetResponse.is(definition);
  const isInheritingLifecycle = isInheritLifecycle(definition.stream.ingest.lifecycle);

  const getRetentionOrigin = () => {
    if (isWiredStream) {
      if (isInheritingLifecycle) {
        return i18n.translate('xpack.streams.streamDetailLifecycle.inheritingFromParent', {
          defaultMessage: 'Inherit from parent',
        });
      } else if (!isRootStream) {
        return i18n.translate('xpack.streams.streamDetailLifecycle.overrideParent', {
          defaultMessage: 'Override parent',
        });
      }
      return null;
    }

    return isInheritingLifecycle
      ? i18n.translate('xpack.streams.streamDetailLifecycle.inheritingIndexTemplate', {
          defaultMessage: 'Inherit from index template',
        })
      : i18n.translate('xpack.streams.streamDetailLifecycle.overrideIndexTemplate', {
          defaultMessage: 'Override index template',
        });
  };

  const retentionOrigin = getRetentionOrigin();

  const getMetrics = () => {
    const baseSubtitles: string[] = [];
    let data: React.ReactNode;

    if (isIlmLifecycle(lifecycle)) {
      baseSubtitles.push(
        i18n.translate('xpack.streams.streamDetailLifecycle.retention.ilmPolicy', {
          defaultMessage: 'ILM policy',
        })
      );
      data = <IlmLink lifecycle={lifecycle} />;
    } else {
      const formattedRetention =
        isDslLifecycle(lifecycle) && getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention);
      const isForeverRetention = formattedRetention === undefined;

      baseSubtitles.push(
        isForeverRetention
          ? i18n.translate('xpack.streams.streamDetailLifecycle.retention.forever', {
              defaultMessage: 'Forever',
            })
          : i18n.translate('xpack.streams.streamDetailLifecycle.retention.custom', {
              defaultMessage: 'Custom period',
            })
      );
      data = formattedRetention ?? '∞';
    }

    const subtitles = retentionOrigin ? [...baseSubtitles, retentionOrigin] : baseSubtitles;

    return [
      {
        data,
        subtitle: subtitles,
        'data-test-subj': 'retention',
      },
    ];
  };

  const title = i18n.translate('xpack.streams.streamDetailLifecycle.retention.title', {
    defaultMessage: 'Retention',
  });

  const metrics = getMetrics();

  return (
    <BaseMetricCard
      title={title}
      actions={
        <EuiButtonEmpty
          data-test-subj="streamsAppRetentionMetadataEditDataRetentionButton"
          size="s"
          onClick={openEditModal}
          disabled={!definition.privileges.lifecycle}
          iconType="pencil"
          aria-label={i18n.translate(
            'xpack.streams.entityDetailViewWithoutParams.editDataRetentionAriaLabel',
            {
              defaultMessage: 'Edit data retention',
            }
          )}
        >
          {i18n.translate('xpack.streams.entityDetailViewWithoutParams.editDataRetention', {
            defaultMessage: 'Edit data retention',
          })}
        </EuiButtonEmpty>
      }
      metrics={metrics}
    />
  );
};
