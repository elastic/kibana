/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Streams } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle, isInheritLifecycle } from '@kbn/streams-schema';
import { useBoolean } from '@kbn/react-hooks';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { isRoot } from '@kbn/streams-schema';
import { BaseMetricCard } from '../../common/base_metric_card';
import type { LifecycleEditAction } from '../modal';
import { IlmLink } from '../ilm_link';
import { getTimeSizeAndUnitLabel } from '../../helpers/format_size_units';

export const RetentionCard = ({
  definition,
  lifecycleActions,
  openEditModal,
}: {
  definition: Streams.ingest.all.GetResponse;
  lifecycleActions: Array<{ name: string; action: LifecycleEditAction }>;
  openEditModal: (action: LifecycleEditAction) => void;
}) => {
  const [isMenuOpen, { toggle: toggleMenu, off: closeMenu }] = useBoolean(false);
  const lifecycle = definition.effective_lifecycle;

  const editDataRetention = i18n.translate(
    'xpack.streams.streamDetailLifecycle.storageSize.editDataRetentionButton',
    {
      defaultMessage: 'Edit data retention',
    }
  );

  const contextualMenu =
    lifecycleActions.length === 0 ? null : (
      <EuiPopover
        button={
          <EuiToolTip
            content={
              !definition.privileges.lifecycle
                ? i18n.translate(
                    'xpack.streams.entityDetailViewWithoutParams.editDataRetention.insufficientPrivileges',
                    {
                      defaultMessage: "You don't have sufficient privileges to change retention.",
                    }
                  )
                : i18n.translate(
                    'xpack.streams.entityDetailViewWithoutParams.editDataRetention.edit',
                    {
                      defaultMessage: 'Edit data retention',
                    }
                  )
            }
          >
            <EuiButtonIcon
              data-test-subj="streamsAppRetentionMetadataEditDataRetentionButton"
              onClick={toggleMenu}
              disabled={!definition.privileges.lifecycle}
              iconType="pencil"
              size="xs"
              color="text"
              display="base"
              aria-label={editDataRetention}
            />
          </EuiToolTip>
        }
        isOpen={isMenuOpen}
        closePopover={closeMenu}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel
          items={lifecycleActions.map(({ name, action }) => (
            <EuiContextMenuItem
              key={action}
              onClick={() => {
                closeMenu();
                openEditModal(action);
              }}
            >
              {name}
            </EuiContextMenuItem>
          ))}
        />
      </EuiPopover>
    );

  const isInheritingFromParent = isInheritLifecycle(definition.stream.ingest.lifecycle);
  const isRootStream = isRoot(definition.stream.name);
  const isWiredStream = Streams.WiredStream.GetResponse.is(definition);
  const overrideParent =
    !isInheritingFromParent &&
    isWiredStream &&
    !isRootStream &&
    i18n.translate('xpack.streams.streamDetailLifecycle.overrideParent', {
      defaultMessage: 'Override parent',
    });

  const getDslMetrics = () => {
    const subtitles = [];

    const isForeverRetention =
      isDslLifecycle(lifecycle) &&
      getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention) === undefined;

    const canHaveCustomRetention = !isWiredStream || isRootStream;

    if (isForeverRetention) {
      subtitles.push(
        i18n.translate('xpack.streams.streamDetailLifecycle.retention.forever', {
          defaultMessage: 'Forever',
        })
      );
    }

    if (
      !isInheritingFromParent &&
      canHaveCustomRetention &&
      !(isRootStream && isForeverRetention)
    ) {
      subtitles.push(
        i18n.translate('xpack.streams.streamDetailLifecycle.retention.custom', {
          defaultMessage: 'Custom period',
        })
      );
    } else if (isInheritingFromParent && !isForeverRetention) {
      subtitles.push(
        i18n.translate('xpack.streams.streamDetailLifecycle.retention.default', {
          defaultMessage: 'Default period',
        })
      );
    }

    if (overrideParent) {
      subtitles.push(overrideParent);
    }

    return [
      {
        data:
          (isDslLifecycle(lifecycle) && getTimeSizeAndUnitLabel(lifecycle.dsl.data_retention)) ??
          '∞',
        subtitle: subtitles,
        'data-test-subj': 'retention',
      },
    ];
  };

  const getIlmMetrics = () => {
    const subtitles = [
      i18n.translate('xpack.streams.streamDetailLifecycle.retention.ilmPolicy', {
        defaultMessage: 'ILM policy',
      }),
    ];
    if (overrideParent) {
      subtitles.push(overrideParent);
    }
    return [
      {
        data: isIlmLifecycle(lifecycle) ? <IlmLink lifecycle={lifecycle} /> : '',
        subtitle: subtitles,
        'data-test-subj': 'retention',
      },
    ];
  };

  const title = i18n.translate('xpack.streams.streamDetailLifecycle.retention.title', {
    defaultMessage: 'Retention',
  });

  const metrics = isIlmLifecycle(lifecycle) ? getIlmMetrics() : getDslMetrics();

  return <BaseMetricCard grow title={title} actions={contextualMenu} metrics={metrics} />;
};
