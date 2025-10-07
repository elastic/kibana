/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { capitalize, first } from 'lodash';
import React, { useMemo } from 'react';
import type { IlmPolicyDeletePhase, IlmPolicyPhase, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../../hooks/use_kibana';
import { orderIlmPhases, parseDurationInSeconds } from '../helpers/helpers';
import { useIlmPhasesColorAndDescription } from '../hooks/use_ilm_phases_color_and_description';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
import { getTimeSizeAndUnitLabel } from '../helpers/format_size_units';
import { formatBytes } from '../helpers/format_bytes';

export function IlmSummary({
  definition,
  stats,
}: {
  definition: Streams.ingest.all.GetResponse;
  stats?: DataStreamStats;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { value, loading, error } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/streams/{name}/lifecycle/_stats', {
        params: { path: { name: definition.stream.name } },
        signal,
      });
    },
    // we pass the stats as a hack to refresh the ilm summary
    // when the ingestion rate graph is refreshed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, definition, stats]
  );

  const phasesWithGrow = useMemo(() => {
    if (!value) return undefined;

    const orderedPhases = orderIlmPhases(value.phases).reverse();
    const totalDuration = parseDurationInSeconds(first(orderedPhases)!.min_age);

    return orderedPhases.map((phase, index, phases) => {
      const prevPhase = phases[index - 1];
      if (!prevPhase) {
        return { ...phase, grow: phase.name === 'delete' ? false : 2 };
      }

      const phaseDuration =
        parseDurationInSeconds(prevPhase!.min_age) - parseDurationInSeconds(phase!.min_age);
      return {
        ...phase,
        grow: Math.max(2, Math.round((phaseDuration / totalDuration) * 10)),
      };
    });
  }, [value]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText>
              <h5>
                {i18n.translate('xpack.streams.streamDetailLifecycle.ilmDataTiers', {
                  defaultMessage: 'ILM policy data tiers',
                })}
              </h5>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{loading && <EuiLoadingSpinner size="s" />}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel grow={true} hasShadow={false} hasBorder={false} paddingSize="s">
        {error || !phasesWithGrow ? null : (
          <EuiFlexGroup direction="row" gutterSize="none" responsive={false}>
            {phasesWithGrow.map((phase, index) => (
              <EuiFlexItem
                key={`${phase.name}-timeline`}
                grow={phase.grow as false | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}
              >
                <IlmPhase phase={phase} minAge={phasesWithGrow[index - 1]?.min_age} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </EuiFlexGroup>
  );
}

function IlmPhase({
  phase,
  minAge,
}: {
  phase: IlmPolicyPhase | IlmPolicyDeletePhase;
  minAge?: string;
}) {
  const borderRadius =
    phase.name === 'delete'
      ? minAge
        ? '4px 4px 4px 4px'
        : '4px 0px 0px 4px'
      : phase.name === 'hot'
      ? minAge
        ? '0px 4px 4px 0px'
        : '0px'
      : minAge
      ? '0px'
      : '4px 0px 0px 4px';
  const { ilmPhases } = useIlmPhasesColorAndDescription();
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiPanel
          paddingSize="s"
          hasBorder={false}
          hasShadow={false}
          css={{
            backgroundColor: ilmPhases[phase.name].color,
            margin: '0',
            borderRadius,
            borderRight:
              phase.name !== 'delete'
                ? `1px solid ${euiTheme.colors.backgroundBasePlain}`
                : undefined,
            paddingLeft:
              phase.name !== 'hot' ? `1px solid ${euiTheme.colors.backgroundBasePlain}` : undefined,
            minHeight: '50px',
          }}
          grow={false}
        >
          {phase.name === 'delete' ? (
            <EuiText
              css={{
                height: '100%',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                minWidth: '30px',
                justifyContent: 'center',
              }}
            >
              <EuiIcon size="m" type="trash" />
            </EuiText>
          ) : (
            <>
              <EuiText size="xs" color={euiTheme.colors.plainDark} textAlign="right">
                <b>{capitalize(phase.name)}</b>
              </EuiText>
              {'size_in_bytes' in phase && (
                <EuiText size="xs" color={euiTheme.colors.plainDark} textAlign="right">
                  {formatBytes(phase.size_in_bytes)}
                </EuiText>
              )}
            </>
          )}
        </EuiPanel>
        <EuiPanel
          paddingSize="s"
          borderRadius="none"
          hasBorder={false}
          hasShadow={false}
          grow={false}
          css={{
            paddingBottom: '5px',
            ...(phase.name !== 'delete' && {
              borderLeft: `1px solid ${ilmPhases.delete.color}`,
            }),
          }}
        />
      </EuiFlexGroup>

      <EuiFlexGroup justifyContent="flexStart">
        {phase.name !== 'delete' ? (
          <EuiPanel
            paddingSize="xs"
            css={{
              marginLeft: minAge ? '-40px' : '-10px',
              width: minAge ? '80px' : '20px',
            }}
            grow={false}
            hasBorder={false}
            hasShadow={false}
          >
            <EuiText textAlign="center" size="xs" color="subdued">
              {minAge ? getTimeSizeAndUnitLabel(minAge) : '∞'}
            </EuiText>
          </EuiPanel>
        ) : undefined}
      </EuiFlexGroup>
    </>
  );
}
