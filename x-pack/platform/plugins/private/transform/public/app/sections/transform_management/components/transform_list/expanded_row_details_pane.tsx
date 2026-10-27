/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import moment from 'moment-timezone';

import { EuiButtonEmpty, EuiBadge, EuiCodeBlock, EuiPopover, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import { isDefined } from '@kbn/ml-is-defined';

import { isTransformStats } from '../../../../../../common/types/transform_stats';
import type { TransformHealthAlertRule } from '../../../../../../common/types/alerting';

import type { TransformListRow } from '../../../../common';
import { useAppDependencies } from '../../../../app_dependencies';
import { isTransformListRowWithStats } from '../../../../common/transform_list';
import { useGetTransformStats } from '../../../../hooks';
import { useTransformHasLinkedProjects } from '../../../../hooks/use_transform_has_linked_projects';

import type { SectionConfig, SectionItem } from './expanded_row_column_view';
import { ExpandedRowColumnView } from './expanded_row_column_view';

const notAvailableMessage = i18n.translate(
  'xpack.transform.transformList.transformDetails.notAvailable',
  {
    defaultMessage: 'n/a',
  }
);

interface ExpandedRowDetailsPaneProps {
  item: TransformListRow;
  onAlertEdit: (alertRule: TransformHealthAlertRule) => void;
}

export const SourceIndexDescription: FC<{ index: string | string[] }> = ({ index }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!Array.isArray(index)) {
    return index;
  }
  if (Array.isArray(index) && index.length === 1) {
    return index[0];
  }

  return (
    <>
      {index[0]}{' '}
      <EuiPopover
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        aria-label={i18n.translate(
          'xpack.transform.transformList.transformDetails.sourceIndex.popoverLabel',
          { defaultMessage: 'Source indices' }
        )}
        anchorPosition="downLeft"
        panelPaddingSize="s"
        button={
          <EuiBadge
            data-test-subj="transformSourceIndexBadge"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            onClickAriaLabel={i18n.translate(
              'xpack.transform.transformList.transformDetails.sourceIndex.showAllLabel',
              { defaultMessage: 'Show all source indices' }
            )}
            css={{
              verticalAlign: 'top',
            }}
          >
            +{index.length - 1}
          </EuiBadge>
        }
      >
        <EuiText
          size="s"
          data-test-subj="transformSourceIndexPopover"
          css={{ overflowY: 'scroll' }}
        >
          <ul
            css={{
              maxWidth: '600px',
              maxHeight: '600px',
              overflowWrap: 'break-word',
            }}
          >
            {index.map((sourceIndex) => (
              <li key={sourceIndex}>{sourceIndex}</li>
            ))}
          </ul>
        </EuiText>
      </EuiPopover>
    </>
  );
};

export const ExpandedRowDetailsPane: FC<ExpandedRowDetailsPaneProps> = ({ item, onAlertEdit }) => {
  const { data: fullStats, isError, isLoading } = useGetTransformStats(item.id, false, true);
  const { cps } = useAppDependencies();
  const { hasLinkedProjects } = useTransformHasLinkedProjects(cps?.cpsManager);

  let displayStats = {};

  if (fullStats !== undefined && !isLoading && !isError) {
    displayStats = fullStats.transforms[0];
  } else if (isTransformListRowWithStats(item)) {
    displayStats = item.stats;
  }

  const configItems: SectionItem[] = [
    {
      title: i18n.translate(
        'xpack.transform.transformList.transformDetails.transformVersionLabel',
        {
          defaultMessage: 'Transform version',
        }
      ),
      description: item.config.version ?? '',
    },
    ...(item.config.create_time !== undefined
      ? [
          {
            title: i18n.translate(
              'xpack.transform.transformList.transformDetails.createTimeLabel',
              {
                defaultMessage: 'Create time',
              }
            ),
            description:
              formatHumanReadableDateTimeSeconds(moment(item.config.create_time).unix() * 1000) ??
              '',
          },
        ]
      : []),
    ...(hasLinkedProjects !== false && isDefined(item.config.source.project_routing)
      ? [
          {
            title: i18n.translate(
              'xpack.transform.transformList.transformDetails.projectRoutingLabel',
              {
                defaultMessage: 'Project routing',
              }
            ),
            description: item.config.source.project_routing,
          },
        ]
      : []),
    {
      title: i18n.translate('xpack.transform.transformList.transformDetails.sourceIndexLabel', {
        defaultMessage: 'Source index',
      }),
      description: <SourceIndexDescription index={item.config.source.index} />,
    },
    {
      title: i18n.translate(
        'xpack.transform.transformList.transformDetails.destinationIndexLabel',
        {
          defaultMessage: 'Destination index',
        }
      ),
      description: item.config.dest.index,
    },
    ...(item.config.authorization
      ? [
          {
            title: i18n.translate(
              'xpack.transform.transformList.transformDetails.authorizationLabel',
              {
                defaultMessage: 'Authorization',
              }
            ),
            description: (
              <EuiCodeBlock
                data-test-subj="transformAuthorization"
                fontSize="s"
                language="json"
                paddingSize="none"
                transparentBackground
              >
                {JSON.stringify(item.config.authorization, null, 2)}
              </EuiCodeBlock>
            ),
          },
        ]
      : []),
  ];
  if (isDefined(item.config.settings?.num_failure_retries)) {
    configItems.push({
      title: i18n.translate(
        'xpack.transform.transformList.transformDetails.numberOfFailureRetriesLabel',
        {
          defaultMessage: 'Number of failure retries',
        }
      ),
      description: item.config.settings.num_failure_retries,
    });
  }

  const checkpointingItems: SectionItem[] = [];
  if (isTransformStats(displayStats)) {
    if (displayStats.checkpointing.changes_last_detected_at !== undefined) {
      checkpointingItems.push({
        title: i18n.translate(
          'xpack.transform.transformList.transformDetails.changesLastDetectedAtLabel',
          {
            defaultMessage: 'Changes last detected at',
          }
        ),
        description: formatHumanReadableDateTimeSeconds(
          displayStats.checkpointing.changes_last_detected_at
        ),
      });
    }

    if (displayStats.checkpointing.last !== undefined) {
      checkpointingItems.push({
        title: i18n.translate(
          'xpack.transform.transformList.transformDetails.lastCheckpointLabel',
          {
            defaultMessage: 'Last checkpoint',
          }
        ),
        description: displayStats.checkpointing.last.checkpoint,
      });
      if (displayStats.checkpointing.last.timestamp_millis !== undefined) {
        checkpointingItems.push({
          title: i18n.translate(
            'xpack.transform.transformList.transformDetails.lastTimestampLabel',
            {
              defaultMessage: 'Last timestamp',
            }
          ),
          description: formatHumanReadableDateTimeSeconds(
            displayStats.checkpointing.last.timestamp_millis
          ),
        });
        checkpointingItems.push({
          title: i18n.translate(
            'xpack.transform.transformList.transformDetails.lastTimestampMillisLabel',
            {
              defaultMessage: 'Last timestamp (milliseconds)',
            }
          ),
          description: displayStats.checkpointing.last.timestamp_millis,
        });
      }
    }

    if (displayStats.checkpointing.last_search_time !== undefined) {
      checkpointingItems.push({
        title: i18n.translate(
          'xpack.transform.transformList.transformDetails.lastSearchTimeLabel',
          {
            defaultMessage: 'Last search time',
          }
        ),
        description: formatHumanReadableDateTimeSeconds(
          displayStats.checkpointing.last_search_time
        ),
      });
    }

    if (displayStats.checkpointing.next !== undefined) {
      checkpointingItems.push({
        title: i18n.translate(
          'xpack.transform.transformList.transformDetails.nextCheckpointLabel',
          {
            defaultMessage: 'Next checkpoint',
          }
        ),
        description: displayStats.checkpointing.next.checkpoint,
      });
      if (displayStats.checkpointing.next.checkpoint_progress !== undefined) {
        checkpointingItems.push({
          title: i18n.translate(
            'xpack.transform.transformList.transformDetails.totalDocumentsLabel',
            {
              defaultMessage: 'Total documents',
            }
          ),
          description:
            displayStats.checkpointing.next.checkpoint_progress.total_docs ?? notAvailableMessage,
        });
        checkpointingItems.push({
          title: i18n.translate(
            'xpack.transform.transformList.transformDetails.documentsRemainingLabel',
            {
              defaultMessage: 'Documents remaining',
            }
          ),
          description:
            displayStats.checkpointing.next.checkpoint_progress.docs_remaining ??
            notAvailableMessage,
        });
        checkpointingItems.push({
          title: i18n.translate('xpack.transform.transformList.transformDetails.progressLabel', {
            defaultMessage: 'Progress',
          }),
          description:
            typeof displayStats.checkpointing.next.checkpoint_progress.percent_complete === 'number'
              ? `${Math.round(
                  displayStats.checkpointing.next.checkpoint_progress.percent_complete
                )}%`
              : notAvailableMessage,
        });
      }
    }

    if (displayStats.checkpointing.operations_behind !== undefined) {
      checkpointingItems.push({
        title: i18n.translate(
          'xpack.transform.transformList.transformDetails.operationsBehindLabel',
          {
            defaultMessage: 'Operations behind',
          }
        ),
        description: displayStats.checkpointing.operations_behind,
      });
    }
  }

  const general: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.generalTitle', {
      defaultMessage: 'General',
    }),
    items: configItems,
    position: 'left',
  };

  const alertRuleItems: SectionItem[] | undefined = item.alerting_rules?.map((rule) => {
    return {
      title: (
        <EuiButtonEmpty
          iconType={'pencil'}
          iconSide={'left'}
          onClick={() => {
            onAlertEdit(rule);
          }}
          flush="left"
          size={'xs'}
          iconSize={'s'}
        >
          {rule.name}
        </EuiButtonEmpty>
      ),
      description: rule.executionStatus.status,
    };
  });

  const checkpointing: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.checkpointTitle', {
      defaultMessage: 'Checkpointing',
    }),
    items: checkpointingItems,
    position: 'right',
  };

  const alertingRules: SectionConfig = {
    title: i18n.translate('xpack.transform.transformList.transformDetails.alertRulesTitle', {
      defaultMessage: 'Alert rules',
    }),
    items: alertRuleItems!,
    position: 'right',
  };

  return (
    <ExpandedRowColumnView
      sections={[general, checkpointing, ...(alertingRules.items ? [alertingRules] : [])]}
      showErrorCallout={isError}
      dataTestSubj={'transformDetailsTabContent'}
    />
  );
};
