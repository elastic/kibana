/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';
import { EnrichedDeprecationInfo } from '../../../common/types';

export async function getHealthIndicators(
  dataClient: IScopedClusterClient
): Promise<EnrichedDeprecationInfo[]> {
  const healthIndicators = await dataClient.asCurrentUser.healthReport();
  const isStatusNotGreen = (indicator?: estypes.HealthReportBaseIndicator): boolean => {
    return !!(indicator?.status && indicator?.status !== 'green');
  };

  // Temporarily ignoring due to untyped ES indicators
  // types will be available during 8.9.0
  // @ts-ignore
  return [
    ...[
      // @ts-ignore
      healthIndicators.indicators.shards_capacity as estypes.HealthReportBaseIndicator,
    ]
      .filter(isStatusNotGreen)
      .flatMap(({ status, symptom, impacts, diagnosis }) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return (diagnosis || []).map(({ cause, action, help_url }) => ({
          type: 'health_indicator',
          details: symptom,
          message: cause,
          url: help_url,
          isCritical: status === 'red',
          resolveDuringUpgrade: false,
          correctiveAction: { type: 'healthIndicator', cause, action, impacts },
        }));
      }),
    ...[healthIndicators.indicators.disk as estypes.HealthReportDiskIndicator]
      .filter(isStatusNotGreen)
      .flatMap(({ status, symptom, details }) => {
        return {
          type: 'health_indicator',
          isCritical: status === 'red',
          ...getShardCapacityDeprecationInfo({ symptom, details }),
        };
      }),
  ];
}

export function getShardCapacityDeprecationInfo({
  symptom,
  details,
}: {
  details: any;
  symptom: any;
}) {
  // When we dont have a details field for our indicator, we can only report
  // the symptom to the user given that's the only information about the deprecation
  // we have.
  if (!details) {
    return {
      details: symptom,
      message: symptom,
      url: null,
      resolveDuringUpgrade: false,
    };
  }

  const causes = [];
  if (details.indices_with_readonly_block > 0) {
    causes.push(
      i18n.translate(
        'xpack.upgradeAssistant.esDeprecationsStatus.indicesWithReadonlyBlockCauseMessage',
        {
          defaultMessage:
            'The number of indices the system enforced a read-only index block (`index.blocks.read_only_allow_delete`) on because the cluster is running out of space.',
        }
      )
    );
  }

  if (details.nodes_over_high_watermark > 0) {
    causes.push(
      i18n.translate(
        'xpack.upgradeAssistant.esDeprecationsStatus.nodesOverHighWatermarkCauseMessage',
        {
          defaultMessage:
            'The number of nodes that are running low on disk and it is likely that they will run out of space. Their disk usage has tripped the <<cluster-routing-watermark-high, high watermark threshold>>.',
          ignoreTag: true,
        }
      )
    );
  }

  if (details.nodes_over_flood_stage_watermark > 0) {
    causes.push(
      i18n.translate(
        'xpack.upgradeAssistant.esDeprecationsStatus.nodesOverFloodStageWatermarkCauseMessage',
        {
          defaultMessage:
            'The number of nodes that have run out of disk. Their disk usage has tripped the <<cluster-routing-flood-stage, flood stagewatermark threshold>>.',
          ignoreTag: true,
        }
      )
    );
  }

  return {
    details: symptom,
    message: symptom,
    url: null,
    resolveDuringUpgrade: false,
    correctiveAction: {
      type: 'healthIndicator',
      impacts: details,
      cause: causes.join('\n'),
    },
  };
}
